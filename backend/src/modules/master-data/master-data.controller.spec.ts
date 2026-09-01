import { Test, TestingModule } from '@nestjs/testing';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { MasterDataQueryDto } from './dto/master-data-query.dto';

describe('MasterDataController', () => {
  let controller: MasterDataController;
  let service: MasterDataService;

  const mockResponse = {
    data: [
      {
        id: 'test-uuid',
        code: 'TEST_CODE',
        name: 'Test Name',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    meta: {
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };

  const mockMasterDataService = {
    getBusinessLines: jest.fn().mockResolvedValue(mockResponse),
    getMarketTypes: jest.fn().mockResolvedValue(mockResponse),
    getServiceCategories: jest.fn().mockResolvedValue(mockResponse),
    getPassengerTypes: jest.fn().mockResolvedValue(mockResponse),
    getSupplierTypes: jest.fn().mockResolvedValue(mockResponse),
    getUnits: jest.fn().mockResolvedValue(mockResponse),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterDataController],
      providers: [
        {
          provide: MasterDataService,
          useValue: mockMasterDataService,
        },
      ],
    }).compile();

    controller = module.get<MasterDataController>(MasterDataController);
    service = module.get<MasterDataService>(MasterDataService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getBusinessLines to MasterDataService', async () => {
    const query: MasterDataQueryDto = { page: 1, limit: 20, pageSize: 20 };

    const res = await controller.getBusinessLines(query);

    expect(service.getBusinessLines).toHaveBeenCalledWith(query);
    expect(res).toBe(mockResponse);
  });

  it('should delegate getMarketTypes to MasterDataService', async () => {
    const query: MasterDataQueryDto = { page: 1, limit: 20, pageSize: 20 };

    const res = await controller.getMarketTypes(query);

    expect(service.getMarketTypes).toHaveBeenCalledWith(query);
    expect(res).toBe(mockResponse);
  });

  it('should delegate getServiceCategories to MasterDataService', async () => {
    const query: MasterDataQueryDto = { page: 1, limit: 20, pageSize: 20 };

    const res = await controller.getServiceCategories(query);

    expect(service.getServiceCategories).toHaveBeenCalledWith(query);
    expect(res).toBe(mockResponse);
  });

  it('should delegate getPassengerTypes to MasterDataService', async () => {
    const query: MasterDataQueryDto = { page: 1, limit: 20, pageSize: 20 };

    const res = await controller.getPassengerTypes(query);

    expect(service.getPassengerTypes).toHaveBeenCalledWith(query);
    expect(res).toBe(mockResponse);
  });

  it('should delegate getSupplierTypes to MasterDataService', async () => {
    const query: MasterDataQueryDto = { page: 1, limit: 20, pageSize: 20 };

    const res = await controller.getSupplierTypes(query);

    expect(service.getSupplierTypes).toHaveBeenCalledWith(query);
    expect(res).toBe(mockResponse);
  });

  it('should delegate getUnits to MasterDataService', async () => {
    const query: MasterDataQueryDto = { page: 1, limit: 20, pageSize: 20 };

    const res = await controller.getUnits(query);

    expect(service.getUnits).toHaveBeenCalledWith(query);
    expect(res).toBe(mockResponse);
  });
});
