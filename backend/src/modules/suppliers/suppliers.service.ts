import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierType } from './entities/supplier-type.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierType)
    private readonly supplierTypeRepository: Repository<SupplierType>,
    @InjectRepository(EstimateCostLine)
    private readonly estimateCostLineRepository: Repository<EstimateCostLine>,
  ) {}

  /**
   * Resolve the text entered in the supplier form to the existing catalog
   * record, creating a catalog entry when this is a new supplier type.
   */
  private async findOrCreateSupplierType(
    name: string,
    organizationId: string,
  ): Promise<SupplierType> {
    const trimmedName = name.trim();
    const existingType =
      (await this.supplierTypeRepository.findOne({
        where: { name: ILike(trimmedName), organizationId },
      })) ??
      (await this.supplierTypeRepository.findOne({
        where: { name: ILike(trimmedName), organizationId: IsNull(), isSystem: true },
      }));
    if (existingType) return existingType;

    const baseCode =
      trimmedName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toUpperCase()
        .slice(0, 40) || 'CUSTOM';

    let code = baseCode;
    let suffix = 1;
    while (
      await this.supplierTypeRepository.findOne({
        where: [
          { code, organizationId },
          { code, organizationId: IsNull(), isSystem: true },
        ],
      })
    ) {
      code = `${baseCode.slice(0, 40 - String(suffix).length - 1)}-${suffix}`;
      suffix += 1;
    }

    const supplierType = this.supplierTypeRepository.create({
      code,
      name: trimmedName,
      status: 'ACTIVE',
      sortOrder: 0,
      organizationId,
    });
    return this.supplierTypeRepository.save(supplierType);
  }

  async findAll(
    user: CurrentUserPayload,
    queryDto: QuerySupplierDto,
  ): Promise<PaginatedResponse<Supplier>> {
    const page = Math.max(1, queryDto.page || 1);
    const limit = Math.min(
      100,
      Math.max(1, queryDto.pageSize || queryDto.limit || 20),
    );
    const { search, status, supplierTypeId } = queryDto;
    const organizationId = user.organizationId;

    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.supplierType', 'supplierType')
      .where('supplier.organizationId = :organizationId', { organizationId });

    if (status) {
      queryBuilder.andWhere('supplier.status = :status', { status });
    }

    if (supplierTypeId) {
      queryBuilder.andWhere('supplier.supplierTypeId = :supplierTypeId', {
        supplierTypeId,
      });
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(supplier.code ILIKE :keyword OR supplier.name ILIKE :keyword OR supplier.phone ILIKE :keyword OR supplier.email ILIKE :keyword OR supplier.taxCode ILIKE :keyword OR supplier.contactName ILIKE :keyword)',
        { keyword },
      );
    }

    queryBuilder
      .orderBy('supplier.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<Supplier> {
    const organizationId = user.organizationId;
    const supplier = await this.supplierRepository.findOne({
      where: { id, organizationId },
      relations: { supplierType: true },
    });

    if (!supplier) {
      throw new NotFoundException(
        `Không tìm thấy nhà cung cấp với ID "${id}" trong tổ chức`,
      );
    }

    return supplier;
  }

  async create(
    user: CurrentUserPayload,
    createSupplierDto: CreateSupplierDto,
  ): Promise<Supplier> {
    const { code, supplierTypeId, supplierTypeName, ...supplierData } =
      createSupplierDto;
    const organizationId = user.organizationId;

    // Check code uniqueness inside organization
    const existingCode = await this.supplierRepository.findOne({
      where: { code, organizationId },
    });
    if (existingCode) {
      throw new ConflictException(
        `Mã nhà cung cấp "${code}" đã tồn tại trong tổ chức`,
      );
    }

    let resolvedSupplierTypeId = supplierTypeId;
    if (supplierTypeName?.trim()) {
      const supplierType =
        await this.findOrCreateSupplierType(supplierTypeName, organizationId);
      resolvedSupplierTypeId = supplierType.id;
    }

    // Validate a legacy supplierTypeId if provided directly by an API client.
    if (resolvedSupplierTypeId && !supplierTypeName?.trim()) {
      const existingType = await this.supplierTypeRepository.findOne({
        where: [
          { id: resolvedSupplierTypeId, organizationId },
          {
            id: resolvedSupplierTypeId,
            organizationId: IsNull(),
            isSystem: true,
          },
        ],
      });
      if (!existingType) {
        throw new NotFoundException(
          `Loại nhà cung cấp với ID "${resolvedSupplierTypeId}" không tồn tại`,
        );
      }
    }

    const supplier = this.supplierRepository.create({
      ...supplierData,
      supplierTypeId: resolvedSupplierTypeId,
      organizationId,
      status: createSupplierDto.status || 'ACTIVE',
    });

    const savedSupplier = await this.supplierRepository.save(supplier);
    this.logger.log(
      `Supplier created: ${savedSupplier.id} (${savedSupplier.code}) by user ${user.id}`,
    );

    return this.findOne(user, savedSupplier.id);
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(user, id);
    const { code, supplierTypeId, supplierTypeName, ...updateData } =
      updateSupplierDto;
    const organizationId = user.organizationId;

    if (code && code !== supplier.code) {
      const existingCode = await this.supplierRepository.findOne({
        where: { code, organizationId },
      });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Mã nhà cung cấp "${code}" đã tồn tại trong tổ chức`,
        );
      }
      supplier.code = code;
    }

    const hasSupplierTypeName = Object.prototype.hasOwnProperty.call(
      updateSupplierDto,
      'supplierTypeName',
    );
    if (hasSupplierTypeName) {
      if (supplierTypeName?.trim()) {
        const supplierType =
          await this.findOrCreateSupplierType(supplierTypeName, organizationId);
        supplier.supplierTypeId = supplierType.id;
      } else {
        supplier.supplierTypeId = null;
      }
    } else if (supplierTypeId && supplierTypeId !== supplier.supplierTypeId) {
      const existingType = await this.supplierTypeRepository.findOne({
        where: [
          { id: supplierTypeId, organizationId },
          {
            id: supplierTypeId,
            organizationId: IsNull(),
            isSystem: true,
          },
        ],
      });
      if (!existingType) {
        throw new NotFoundException(
          `Loại nhà cung cấp với ID "${supplierTypeId}" không tồn tại`,
        );
      }
      supplier.supplierTypeId = supplierTypeId;
    }

    Object.assign(supplier, updateData);
    const updated = await this.supplierRepository.save(supplier);
    this.logger.log(
      `Supplier updated: ${updated.id} (${updated.code}) by user ${user.id}`,
    );

    return this.findOne(user, updated.id);
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const supplier = await this.findOne(user, id);
    const organizationId = user.organizationId;

    // Check if supplier is used in any estimate cost lines
    const activeCostLinesCount = await this.estimateCostLineRepository.count({
      where: { supplierId: id, organizationId },
    });

    if (activeCostLinesCount > 0) {
      throw new ConflictException(
        `Không thể xóa nhà cung cấp "${supplier.name}" vì đang được sử dụng trong ${activeCostLinesCount} dòng chi phí dự toán`,
      );
    }

    await this.supplierRepository.softRemove(supplier);
    this.logger.log(
      `Supplier soft-deleted: ${supplier.id} (${supplier.code}) by user ${user.id}`,
    );
  }
}
