import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MasterDataService } from './master-data.service';
import { BusinessLine } from './entities/business-line.entity';
import { MarketType } from './entities/market-type.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { PassengerType } from './entities/passenger-type.entity';
import { Unit } from './entities/unit.entity';
import { SupplierType } from '../suppliers/entities/supplier-type.entity';

describe('MasterDataService', () => {
  let service: MasterDataService;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const createMockRepo = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  });

  const mockBusinessLineRepo = createMockRepo();
  const mockMarketTypeRepo = createMockRepo();
  const mockServiceCategoryRepo = createMockRepo();
  const mockPassengerTypeRepo = createMockRepo();
  const mockUnitRepo = createMockRepo();
  const mockSupplierTypeRepo = createMockRepo();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataService,
        {
          provide: getRepositoryToken(BusinessLine),
          useValue: mockBusinessLineRepo,
        },
        {
          provide: getRepositoryToken(MarketType),
          useValue: mockMarketTypeRepo,
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: mockServiceCategoryRepo,
        },
        {
          provide: getRepositoryToken(PassengerType),
          useValue: mockPassengerTypeRepo,
        },
        {
          provide: getRepositoryToken(Unit),
          useValue: mockUnitRepo,
        },
        {
          provide: getRepositoryToken(SupplierType),
          useValue: mockSupplierTypeRepo,
        },
      ],
    }).compile();

    service = module.get<MasterDataService>(MasterDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBusinessLines', () => {
    it('should return paginated business lines with default pagination', async () => {
      const mockItems = [
        {
          id: 'bl-1',
          code: 'TOUR_INBOUND',
          name: 'Tour Inbound',
          description: 'Inbound tour',
          status: 'ACTIVE',
          sortOrder: 1,
          createdAt: new Date('2026-08-24T00:00:00.000Z'),
          updatedAt: new Date('2026-08-24T00:00:00.000Z'),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getBusinessLines({
        page: 1,
        limit: 20,
        pageSize: 20,
      });

      expect(mockBusinessLineRepo.createQueryBuilder).toHaveBeenCalledWith(
        'businessLine',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'businessLine.sortOrder',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'businessLine.name',
        'ASC',
      );
      expect(result).toEqual({
        data: mockItems,
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
        },
      });
    });

    it('should filter by status and search keyword', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getBusinessLines({
        page: 2,
        limit: 10,
        pageSize: 10,
        status: 'ACTIVE',
        search: 'INBOUND',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'businessLine.status = :status',
        { status: 'ACTIVE' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(businessLine.code ILIKE :search OR businessLine.name ILIKE :search)',
        { search: '%INBOUND%' },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should cap pageSize at 100 and default page <= 0 to 1', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getBusinessLines({
        page: 0,
        limit: 500,
        pageSize: 500,
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(100);
    });
  });

  describe('getMarketTypes', () => {
    it('should query market types repository', async () => {
      const mockItems = [
        {
          id: 'mt-1',
          code: 'DOMESTIC',
          name: 'Nội địa',
          status: 'ACTIVE',
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getMarketTypes({
        page: 1,
        limit: 20,
        pageSize: 20,
      });

      expect(mockMarketTypeRepo.createQueryBuilder).toHaveBeenCalledWith(
        'marketType',
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0].code).toBe('DOMESTIC');
    });
  });

  describe('getServiceCategories', () => {
    it('should query service categories repository', async () => {
      const mockItems = [
        {
          id: 'sc-1',
          code: 'HOTEL',
          name: 'Khách sạn',
          status: 'ACTIVE',
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getServiceCategories({
        page: 1,
        limit: 20,
        pageSize: 20,
      });

      expect(mockServiceCategoryRepo.createQueryBuilder).toHaveBeenCalledWith(
        'serviceCategory',
      );
      expect(result.data[0].code).toBe('HOTEL');
    });
  });

  describe('getPassengerTypes', () => {
    it('should query passenger types repository', async () => {
      const mockItems = [
        {
          id: 'pt-1',
          code: 'ADULT',
          name: 'Người lớn',
          status: 'ACTIVE',
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getPassengerTypes({
        page: 1,
        limit: 20,
        pageSize: 20,
      });

      expect(mockPassengerTypeRepo.createQueryBuilder).toHaveBeenCalledWith(
        'passengerType',
      );
      expect(result.data[0].code).toBe('ADULT');
    });
  });

  describe('getSupplierTypes', () => {
    it('should query supplier types repository', async () => {
      const mockItems = [
        {
          id: 'st-1',
          code: 'HOTEL',
          name: 'Khách sạn / Resort',
          status: 'ACTIVE',
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getSupplierTypes({
        page: 1,
        limit: 20,
        pageSize: 20,
      });

      expect(mockSupplierTypeRepo.createQueryBuilder).toHaveBeenCalledWith(
        'supplierType',
      );
      expect(result.data[0].code).toBe('HOTEL');
    });
  });

  describe('getUnits', () => {
    it('should query units repository without sortOrder column', async () => {
      const mockItems = [
        {
          id: 'u-1',
          code: 'PAX',
          name: 'Khách',
          symbol: 'Pax',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getUnits({
        page: 1,
        limit: 20,
        pageSize: 20,
      });

      expect(mockUnitRepo.createQueryBuilder).toHaveBeenCalledWith('unit');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('unit.name', 'ASC');
      expect(result.data[0].symbol).toBe('Pax');
    });
  });
});
