import { Test, TestingModule } from '@nestjs/testing';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('EstimatesController', () => {
  let controller: EstimatesController;
  let service: EstimatesService;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['estimate.view', 'estimate.create', 'estimate.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockEstimatesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimatesController],
      providers: [
        {
          provide: EstimatesService,
          useValue: mockEstimatesService,
        },
      ],
    }).compile();

    controller = module.get<EstimatesController>(EstimatesController);
    service = module.get<EstimatesService>(EstimatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll and return paginated estimates', async () => {
      const queryDto = new QueryEstimateDto();
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockEstimatesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUserPayload, queryDto);

      expect(service.findAll).toHaveBeenCalledWith(mockUserPayload, queryDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return estimate details', async () => {
      const mockEstimate = { id: 'est-uuid', note: 'VIP Estimate' };
      mockEstimatesService.findOne.mockResolvedValue(mockEstimate);

      const result = await controller.findOne(mockUserPayload, 'est-uuid');

      expect(service.findOne).toHaveBeenCalledWith(mockUserPayload, 'est-uuid');
      expect(result).toEqual(mockEstimate);
    });
  });

  describe('create', () => {
    it('should call service.create and return created estimate', async () => {
      const createDto: CreateEstimateDto = {
        dossierId: 'dossier-uuid',
        note: 'VIP Note',
      };
      const mockEstimate = { id: 'est-uuid', ...createDto };
      mockEstimatesService.create.mockResolvedValue(mockEstimate);

      const result = await controller.create(mockUserPayload, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserPayload, createDto);
      expect(result).toEqual(mockEstimate);
    });
  });

  describe('update', () => {
    it('should call service.update and return updated estimate', async () => {
      const updateDto: UpdateEstimateDto = { note: 'Updated Note' };
      const mockEstimate = { id: 'est-uuid', note: 'Updated Note' };
      mockEstimatesService.update.mockResolvedValue(mockEstimate);

      const result = await controller.update(
        mockUserPayload,
        'est-uuid',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUserPayload,
        'est-uuid',
        updateDto,
      );
      expect(result).toEqual(mockEstimate);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockEstimatesService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUserPayload, 'est-uuid');

      expect(service.remove).toHaveBeenCalledWith(mockUserPayload, 'est-uuid');
    });
  });
});
