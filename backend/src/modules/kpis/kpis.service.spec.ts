import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KpisService } from './kpis.service';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiResult } from './entities/kpi-result.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { KpiMetric, KpiPeriodType } from '../../common/enums';

describe('KpisService', () => {
  let service: KpisService;
  let targetRepository: any;
  let resultRepository: any;
  let dossierRepository: any;
  let estimateRepository: any;
  let revenueLineRepository: any;
  let costLineRepository: any;

  beforeEach(async () => {
    targetRepository = {
      find: jest.fn(),
    };

    resultRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve(dto)),
    };

    dossierRepository = {
      createQueryBuilder: jest.fn(),
    };

    estimateRepository = {
      createQueryBuilder: jest.fn(),
    };

    revenueLineRepository = {
      createQueryBuilder: jest.fn(),
    };

    costLineRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpisService,
        {
          provide: getRepositoryToken(KpiTarget),
          useValue: targetRepository,
        },
        {
          provide: getRepositoryToken(KpiResult),
          useValue: resultRepository,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: dossierRepository,
        },
        {
          provide: getRepositoryToken(Estimate),
          useValue: estimateRepository,
        },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: revenueLineRepository,
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: costLineRepository,
        },
      ],
    }).compile();

    service = module.get<KpisService>(KpisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMyKpi dynamic calculations', () => {
    it('should find targets and map results correctly', async () => {
      const mockTargets = [
        {
          id: 'target-1',
          metricCode: KpiMetric.DOSSIER_COUNT,
          targetValue: 10,
        },
      ];
      targetRepository.find.mockResolvedValue(mockTargets);
      resultRepository.findOne.mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };
      dossierRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findMyKpi('org-id', 'user-id', {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(result).toHaveLength(1);
      expect(result[0].actualValue).toBe(5);
      expect(result[0].achievementRate).toBe(50);
    });
  });
});
