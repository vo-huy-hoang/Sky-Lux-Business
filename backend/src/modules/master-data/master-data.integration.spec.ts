import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { BusinessLine } from './entities/business-line.entity';
import { MarketType } from './entities/market-type.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { PassengerType } from './entities/passenger-type.entity';
import { Unit } from './entities/unit.entity';
import { SupplierType } from '../suppliers/entities/supplier-type.entity';

describe('MasterData Module (Integration)', () => {
  let controller: MasterDataController;

  const mockBusinessLines: Partial<BusinessLine>[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'TOUR_INBOUND',
      name: 'Tour Inbound (Quốc tế vào VN)',
      description: 'Inbound travel',
      status: 'ACTIVE',
      sortOrder: 1,
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'TOUR_OUTBOUND',
      name: 'Tour Outbound (VN ra nước ngoài)',
      description: 'Outbound travel',
      status: 'ACTIVE',
      sortOrder: 2,
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
  ];

  const mockMarketTypes: Partial<MarketType>[] = [
    {
      id: '33333333-3333-3333-3333-333333333333',
      code: 'DOMESTIC',
      name: 'Nội địa',
      description: 'Thị trường nội địa',
      status: 'ACTIVE',
      sortOrder: 1,
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
  ];

  const mockServiceCategories: Partial<ServiceCategory>[] = [
    {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'HOTEL',
      name: 'Khách sạn / Lưu trú',
      description: 'Dịch vụ lưu trú',
      status: 'ACTIVE',
      sortOrder: 1,
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
  ];

  const mockPassengerTypes: Partial<PassengerType>[] = [
    {
      id: '55555555-5555-5555-5555-555555555555',
      code: 'ADULT',
      name: 'Người lớn (>= 12 tuổi)',
      description: 'Vé người lớn',
      status: 'ACTIVE',
      sortOrder: 1,
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
  ];

  const mockSupplierTypes: Partial<SupplierType>[] = [
    {
      id: '66666666-6666-6666-6666-666666666666',
      code: 'HOTEL',
      name: 'Khách sạn / Resort',
      description: 'Nhà cung cấp lưu trú',
      status: 'ACTIVE',
      sortOrder: 1,
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
  ];

  const mockUnits: Partial<Unit>[] = [
    {
      id: '77777777-7777-7777-7777-777777777777',
      code: 'PAX',
      name: 'Khách',
      symbol: 'Pax',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    },
  ];

  const createMockRepo = (data: any[]) => ({
    createQueryBuilder: jest.fn().mockImplementation(() => {
      const filteredData = [...data];
      return {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([filteredData, filteredData.length]),
      };
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterDataController],
      providers: [
        MasterDataService,
        {
          provide: getRepositoryToken(BusinessLine),
          useValue: createMockRepo(mockBusinessLines),
        },
        {
          provide: getRepositoryToken(MarketType),
          useValue: createMockRepo(mockMarketTypes),
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: createMockRepo(mockServiceCategories),
        },
        {
          provide: getRepositoryToken(PassengerType),
          useValue: createMockRepo(mockPassengerTypes),
        },
        {
          provide: getRepositoryToken(Unit),
          useValue: createMockRepo(mockUnits),
        },
        {
          provide: getRepositoryToken(SupplierType),
          useValue: createMockRepo(mockSupplierTypes),
        },
      ],
    }).compile();

    controller = module.get<MasterDataController>(MasterDataController);
  });

  it('API-MASTER-001: should return paginated list of business lines with { data, meta }', async () => {
    const response = await controller.getBusinessLines({
      page: 1,
      limit: 20,
      pageSize: 20,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(2);
    expect(response.data[0].code).toBe('TOUR_INBOUND');
    expect(response.data[1].code).toBe('TOUR_OUTBOUND');
    expect(response.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
    });
  });

  it('API-MASTER-002: should return paginated list of market types with { data, meta }', async () => {
    const response = await controller.getMarketTypes({
      page: 1,
      limit: 20,
      pageSize: 20,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].code).toBe('DOMESTIC');
    expect(response.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it('API-MASTER-003: should return paginated list of service categories with { data, meta }', async () => {
    const response = await controller.getServiceCategories({
      page: 1,
      limit: 20,
      pageSize: 20,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].code).toBe('HOTEL');
    expect(response.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it('API-MASTER-004: should return paginated list of passenger types with { data, meta }', async () => {
    const response = await controller.getPassengerTypes({
      page: 1,
      limit: 20,
      pageSize: 20,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].code).toBe('ADULT');
    expect(response.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it('API-MASTER-005: should return paginated list of supplier types with { data, meta }', async () => {
    const response = await controller.getSupplierTypes({
      page: 1,
      limit: 20,
      pageSize: 20,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].code).toBe('HOTEL');
    expect(response.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it('API-MASTER-006: should return paginated units including symbol field', async () => {
    const response = await controller.getUnits({
      page: 1,
      limit: 20,
      pageSize: 20,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].code).toBe('PAX');
    expect(response.data[0].symbol).toBe('Pax');
    expect(response.meta.total).toBe(1);
  });
});
