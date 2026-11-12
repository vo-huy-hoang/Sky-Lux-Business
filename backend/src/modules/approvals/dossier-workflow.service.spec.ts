import { ConflictException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  OptimisticLockVersionMismatchError,
} from 'typeorm';
import {
  ApprovalStatus,
  DossierStatus,
  EstimateStatus,
} from '../../common/enums';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { DossierWorkflowService } from './dossier-workflow.service';

describe('DossierWorkflowService', () => {
  const user = {
    id: 'sales-user',
    organizationId: 'organization-id',
    employeeCode: 'SL-001',
    fullName: 'Sales User',
    email: 'sales@example.com',
    roles: ['SALES'],
    permissions: ['dossier.update', 'dossier.view.own'],
  } satisfies CurrentUserPayload;

  const dossier = {
    id: 'dossier-id',
    organizationId: user.organizationId,
    code: 'HS-001',
    status: DossierStatus.DRAFT,
    salesUserId: user.id,
    createdBy: user.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Dossier;

  const estimate = {
    id: 'estimate-id',
    dossierId: dossier.id,
    organizationId: user.organizationId,
    versionNo: 1,
    status: EstimateStatus.DRAFT,
  } as Estimate;

  function createService() {
    const dossierRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => dossierRepository.findOne()),
      })),
    };
    const estimateRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => estimateRepository.findOne()),
      })),
    };
    const approvalRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const historyRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Dossier) return dossierRepository;
        if (entity === Estimate) return estimateRepository;
        if (entity === ApprovalRequest) return approvalRepository;
        return historyRepository;
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
      getRepository: jest.fn(),
    } as unknown as DataSource;
    const notificationsService = {
      notify: jest.fn().mockResolvedValue({}),
    };
    const auditLogsService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const redisService = {
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };
    return {
      service: new DossierWorkflowService(
        dataSource,
        auditLogsService as any,
        notificationsService as any,
        redisService as any,
      ),
      dossierRepository,
      estimateRepository,
      approvalRepository,
      historyRepository,
      notificationsService,
      auditLogsService,
      redisService,
    };
  }

  it('submits an owned draft dossier, estimate, approval request and history together', async () => {
    const context = createService();
    context.dossierRepository.findOne.mockResolvedValue({ ...dossier });
    context.dossierRepository.save.mockImplementation((value) => value);
    context.estimateRepository.findOne.mockResolvedValue({ ...estimate });
    context.estimateRepository.save.mockImplementation((value) => value);

    const result = await context.service.submit(user, dossier.id, {
      customerId: 'customer-id',
      operatorUserId: 'operator-id',
    });

    expect(result.data.status).toBe(DossierStatus.SUBMITTED);
    expect(context.dossierRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-id',
        operatorUserId: 'operator-id',
        status: DossierStatus.SUBMITTED,
      }),
    );
    expect(context.estimateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: EstimateStatus.SUBMITTED }),
    );
    expect(context.approvalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ApprovalStatus.PENDING }),
    );
    expect(context.historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBMIT',
        toStatus: DossierStatus.SUBMITTED,
      }),
    );
  });

  it('dispatches notification to operator when sales submits dossier', async () => {
    const context = createService();
    const draftDossier = { ...dossier, operatorUserId: 'operator-user-2' };
    context.dossierRepository.findOne.mockResolvedValue(draftDossier);
    context.dossierRepository.save.mockImplementation((val) => val);
    context.estimateRepository.findOne.mockResolvedValue({ ...estimate });
    context.estimateRepository.save.mockImplementation((val) => val);

    await context.service.submit(user, draftDossier.id, {
      operatorUserId: 'operator-user-2',
    });

    expect(context.notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'operator-user-2',
        type: 'DOSSIER',
        title: expect.stringContaining('HS-001'),
      }),
    );
  });

  it('rejects an approval that skips the required review state', async () => {
    const context = createService();
    context.dossierRepository.findOne.mockResolvedValue({ ...dossier });
    const operator = { ...user, roles: ['OPERATOR'] };

    await expect(
      context.service.approve(operator, dossier.id, {}),
    ).rejects.toThrow(ConflictException);
  });

  it('purges tenant dashboard cache via delByPattern on workflow transition', async () => {
    const context = createService();
    context.dossierRepository.findOne.mockResolvedValue({ ...dossier });
    context.dossierRepository.save.mockImplementation((value) => value);
    context.estimateRepository.findOne.mockResolvedValue({ ...estimate });
    context.estimateRepository.save.mockImplementation((value) => value);

    await context.service.submit(user, dossier.id, {
      customerId: 'customer-id',
    });

    expect(context.redisService.delByPattern).toHaveBeenCalledWith(
      `dashboard:*${user.organizationId}*`,
    );
  });

  describe('Pessimistic & Optimistic Locking (Ticket 06)', () => {
    it('rejects stale version in workflow transition with 409 Conflict without saving', async () => {
      const dossierRepository = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            ...dossier,
            status: DossierStatus.IN_REVIEW,
            version: 3,
          }),
        })),
        save: jest.fn(),
      };
      const estimateRepository = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...estimate }),
        })),
        save: jest.fn(),
      };
      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier) return dossierRepository;
          if (entity === Estimate) return estimateRepository;
          return { create: jest.fn((v) => v), save: jest.fn() };
        }),
      } as unknown as EntityManager;
      const dataSource = {
        transaction: jest.fn((cb: any) => cb(manager)),
        getRepository: jest.fn(),
      } as unknown as DataSource;

      const service = new DossierWorkflowService(
        dataSource,
        { record: jest.fn().mockResolvedValue(undefined) } as any,
      );
      const operator = { ...user, roles: ['OPERATOR'] };

      await expect(
        service.approve(operator, dossier.id, { version: 2 } as any),
      ).rejects.toThrow(ConflictException);
      expect(dossierRepository.save).not.toHaveBeenCalled();
    });

    it('serializes two concurrent approve requests via pessimistic_write so only one succeeds and the second fails with 409', async () => {
      let currentDossier = {
        ...dossier,
        status: DossierStatus.IN_REVIEW,
        version: 1,
      };
      let currentEstimate = {
        ...estimate,
        status: EstimateStatus.IN_REVIEW,
        version: 1,
      };

      let mutexChain: Promise<void> = Promise.resolve();
      const acquireLock = async () => {
        let release!: () => void;
        const previous = mutexChain;
        mutexChain = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        return release;
      };

      const dataSource = {
        transaction: jest.fn(async (cb: any) => {
          let release: (() => void) | undefined;
          let pendingDossier: typeof currentDossier | undefined;
          let pendingEstimate: typeof currentEstimate | undefined;

          const dossierRepo = {
            createQueryBuilder: jest.fn(() => ({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn(async () => {
                release = await acquireLock();
                return { ...currentDossier };
              }),
            })),
            save: jest.fn(async (d: any) => {
              await new Promise((r) => setTimeout(r, 15));
              pendingDossier = { ...d, version: (d.version ?? 1) + 1 };
              return pendingDossier;
            }),
          };

          const estimateRepo = {
            createQueryBuilder: jest.fn(() => ({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getOne: jest.fn(async () => ({ ...currentEstimate })),
            })),
            save: jest.fn(async (e: any) => {
              pendingEstimate = { ...e, version: (e.version ?? 1) + 1 };
              return pendingEstimate;
            }),
          };

          const approvalRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn((v: any) => v),
            save: jest.fn(async (v: any) => v),
          };
          const historyRepo = {
            create: jest.fn((v: any) => v),
            save: jest.fn(async (v: any) => v),
          };

          const manager = {
            getRepository: jest.fn((entity) => {
              if (entity === Dossier) return dossierRepo;
              if (entity === Estimate) return estimateRepo;
              if (entity === ApprovalRequest) return approvalRepo;
              return historyRepo;
            }),
          } as unknown as EntityManager;

          try {
            const res = await cb(manager);
            if (pendingDossier) currentDossier = pendingDossier;
            if (pendingEstimate) currentEstimate = pendingEstimate;
            return res;
          } finally {
            release?.();
          }
        }),
        getRepository: jest.fn(),
      } as unknown as DataSource;

      const service = new DossierWorkflowService(
        dataSource,
        { record: jest.fn().mockResolvedValue(undefined) } as any,
      );
      const operator = { ...user, roles: ['OPERATOR'] };

      const results = await Promise.allSettled([
        service.approve(operator, dossier.id, {}),
        service.approve(operator, dossier.id, {}),
      ]);

      const fulfilled = results.filter(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>[];
      const rejected = results.filter(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult[];

      expect(fulfilled).toHaveLength(1);
      expect(fulfilled[0].value.data.status).toBe(DossierStatus.APPROVED);
      expect(fulfilled[0].value.data.version).toBe(2);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      expect(currentDossier.status).toBe(DossierStatus.APPROVED);
      expect(currentDossier.version).toBe(2);
    });

    it('maps OptimisticLockVersionMismatchError to 409 ConflictException during workflow save', async () => {
      const dossierRepository = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            ...dossier,
            status: DossierStatus.IN_REVIEW,
            version: 1,
          }),
        })),
        save: jest
          .fn()
          .mockRejectedValue(
            new OptimisticLockVersionMismatchError('Dossier', 1, 2),
          ),
      };
      const estimateRepository = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...estimate }),
        })),
        save: jest.fn(),
      };
      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === Dossier) return dossierRepository;
          if (entity === Estimate) return estimateRepository;
          return { create: jest.fn((v) => v), save: jest.fn() };
        }),
      } as unknown as EntityManager;
      const dataSource = {
        transaction: jest.fn((cb: any) => cb(manager)),
        getRepository: jest.fn(),
      } as unknown as DataSource;

      const service = new DossierWorkflowService(
        dataSource,
        { record: jest.fn().mockResolvedValue(undefined) } as any,
      );
      const operator = { ...user, roles: ['OPERATOR'] };

      await expect(
        service.approve(operator, dossier.id, {}),
      ).rejects.toThrow(ConflictException);
    });
  });
});
