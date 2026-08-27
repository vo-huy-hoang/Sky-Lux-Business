import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { BusinessLine } from './entities/business-line.entity';
import { MarketType } from './entities/market-type.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { PassengerType } from './entities/passenger-type.entity';
import { Unit } from './entities/unit.entity';
import { SupplierType } from '../suppliers/entities/supplier-type.entity';
import { MasterDataQueryDto } from './dto/master-data-query.dto';
import {
  PaginatedMasterDataResponseDto,
  MasterDataItemResponseDto,
} from './dto/master-data-response.dto';

interface MasterDataEntityBase extends ObjectLiteral {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  sortOrder?: number;
  symbol?: string;
}

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(BusinessLine)
    private readonly businessLineRepository: Repository<BusinessLine>,
    @InjectRepository(MarketType)
    private readonly marketTypeRepository: Repository<MarketType>,
    @InjectRepository(ServiceCategory)
    private readonly serviceCategoryRepository: Repository<ServiceCategory>,
    @InjectRepository(PassengerType)
    private readonly passengerTypeRepository: Repository<PassengerType>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(SupplierType)
    private readonly supplierTypeRepository: Repository<SupplierType>,
  ) {}

  private async findPaginatedMasterData<T extends MasterDataEntityBase>(
    repository: Repository<T>,
    alias: string,
    query: MasterDataQueryDto,
    hasSortOrder = true,
  ): Promise<PaginatedMasterDataResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const qb = repository.createQueryBuilder(alias);

    if (query.status) {
      qb.andWhere(`${alias}.status = :status`, { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        `(${alias}.code ILIKE :search OR ${alias}.name ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    if (hasSortOrder) {
      qb.orderBy(`${alias}.sortOrder`, 'ASC').addOrderBy(
        `${alias}.name`,
        'ASC',
      );
    } else {
      qb.orderBy(`${alias}.name`, 'ASC');
    }

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    const data: MasterDataItemResponseDto[] = items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      symbol: item.symbol,
      status: item.status,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
      },
    };
  }

  async getBusinessLines(
    query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.findPaginatedMasterData(
      this.businessLineRepository,
      'businessLine',
      query,
      true,
    );
  }

  async getMarketTypes(
    query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.findPaginatedMasterData(
      this.marketTypeRepository,
      'marketType',
      query,
      true,
    );
  }

  async getServiceCategories(
    query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.findPaginatedMasterData(
      this.serviceCategoryRepository,
      'serviceCategory',
      query,
      true,
    );
  }

  async getPassengerTypes(
    query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.findPaginatedMasterData(
      this.passengerTypeRepository,
      'passengerType',
      query,
      true,
    );
  }

  async getSupplierTypes(
    query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.findPaginatedMasterData(
      this.supplierTypeRepository,
      'supplierType',
      query,
      true,
    );
  }

  async getUnits(
    query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.findPaginatedMasterData(
      this.unitRepository,
      'unit',
      query,
      false,
    );
  }
}
