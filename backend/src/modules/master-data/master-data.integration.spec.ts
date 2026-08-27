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

  const mockUnits: Partial<Unit>[] = [
    {
      id: '33333333-3333-3333-3333-333333333333',
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
          useValue: createMockRepo([]),
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: createMockRepo([]),
        },
        {
          provide: getRepositoryToken(PassengerType),
          useValue: createMockRepo([]),
        },
        {
          provide: getRepositoryToken(Unit),
          useValue: createMockRepo(mockUnits),
        },
        {
          provide: getRepositoryToken(SupplierType),
          useValue: createMockRepo([]),
        },
      ],
    }).compile();

    controller = module.get<MasterDataController>(MasterDataController);
  });

  it('API-MASTER-001: should return paginated list of business lines with { data, meta }', async () => {
    const response = await controller.getBusinessLines({
      page: 1,
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

  it('API-MASTER-006: should return paginated units including symbol field', async () => {
    const response = await controller.getUnits({ page: 1, pageSize: 20 });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].code).toBe('PAX');
    expect(response.data[0].symbol).toBe('Pax');
    expect(response.meta.total).toBe(1);
  });
});
