import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async findAll(
    user: CurrentUserPayload,
    queryDto: QuerySupplierDto,
  ): Promise<PaginatedResponse<Supplier>> {
    const { page, limit, search, status } = queryDto;
    const organizationId = user.organizationId;

    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.supplierType', 'supplierType')
      .where('supplier.organizationId = :organizationId', { organizationId });

    if (status) {
      queryBuilder.andWhere('supplier.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(supplier.code ILIKE :search OR supplier.name ILIKE :search OR supplier.phone ILIKE :search OR supplier.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('supplier.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<Supplier> {
    const organizationId = user.organizationId;
    const supplier = await this.supplierRepository.findOne({
      where: { id, organizationId },
      relations: { supplierType: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Không tìm thấy nhà cung cấp với ID "${id}"`);
    }

    return supplier;
  }

  async create(
    user: CurrentUserPayload,
    createSupplierDto: CreateSupplierDto,
  ): Promise<Supplier> {
    const { code } = createSupplierDto;
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

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      organizationId,
      status: 'ACTIVE',
    });

    return this.supplierRepository.save(supplier);
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(user, id);
    const { code, ...updateData } = updateSupplierDto;
    const organizationId = user.organizationId;

    if (code && code !== supplier.code) {
      const existingCode = await this.supplierRepository.findOne({
        where: { code, organizationId },
      });
      if (existingCode) {
        throw new ConflictException(`Mã nhà cung cấp "${code}" đã tồn tại`);
      }
      supplier.code = code;
    }

    Object.assign(supplier, updateData);
    return this.supplierRepository.save(supplier);
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const supplier = await this.findOne(user, id);
    await this.supplierRepository.softRemove(supplier);
  }
}
