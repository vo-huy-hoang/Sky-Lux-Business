import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  OptimisticLockVersionMismatchError,
} from 'typeorm';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  DossierStatus,
  EstimateStatus,
  PaymentDirection,
  PaymentStatus,
} from '../../common/enums';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { RedisService } from '../../common/redis/redis.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ApprovalRequest } from '../approvals/entities/approval-request.entity';
import { DossierChangeRequest } from '../approvals/entities/dossier-change-request.entity';
import { WorkflowHistory } from '../approvals/entities/workflow-history.entity';
import { DossierWorkflowService } from '../approvals/dossier-workflow.service';
import { WorkflowActionDto } from '../approvals/dto/workflow-action.dto';
import { Customer } from '../customers/entities/customer.entity';
import { DocumentsService } from '../documents/documents.service';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimatesController } from '../estimates/estimates.controller';
import { EstimatesService } from '../estimates/estimates.service';
import { UpdateEstimateDto } from '../estimates/dto/update-estimate.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsController } from '../payments/payments.controller';
import { PaymentsService } from '../payments/payments.service';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';
import { Payment } from '../payments/entities/payment.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { DossierAccessPolicyService } from './dossier-access-policy.service';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { Comment } from './entities/comment.entity';
import { Dossier } from './entities/dossier.entity';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('Concurrency, Pessimistic Locks & Optimistic Versioning (Integration)', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const dossierId = '22222222-2222-4222-8222-222222222222';
  const estimateId = '33333333-3333-4333-8333-333333333333';
  const salesUserId = '44444444-4444-4444-8444-444444444444';
  const operatorUserId = '55555555-5555-4555-8555-555555555555';

  const adminUser: CurrentUserPayload = {
    id: operatorUserId,
    organizationId,
    employeeCode: 'OP-001',
    fullName: 'Operator Admin',
    email: 'operator@skylux.vn',
    roles: ['OPERATOR', 'CEO_ADMIN'],
    permissions: ['*'],
  };

  let dossiersController: DossiersController;
  let estimatesController: EstimatesController;
  let paymentsController: PaymentsController;

  // Simulated relational tables & lock queues
  let dossiersTable: Map<string, Dossier>;
  let estimatesTable: Map<string, Estimate>;
  let revenueLinesTable: Map<string, EstimateRevenueLine>;
  let costLinesTable: Map<string, EstimateCostLine>;
  let paymentsTable: Map<string, Payment>;
  let approvalsTable: ApprovalRequest[];
  let historiesTable: WorkflowHistory[];
  let lockQueues: Map<string, Promise<void>>;
  let idCounter: number;

  function nextUuid(prefix = 'aaaaaaaa'): string {
    idCounter += 1;
    const suffix = String(idCounter).padStart(12, '0');
    return `${prefix}-0000-4000-8000-${suffix}`;
  }

  async function acquireLock(
    txHeldLocks: Map<string, () => void>,
    key: string,
  ): Promise<void> {
    if (txHeldLocks.has(key)) return;
    const prev = lockQueues.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = prev.then(() => current);
    lockQueues.set(key, tail);
    await prev;
    txHeldLocks.set(key, release);
  }

  function buildRepository(
    entity: unknown,
    txHeldLocks?: Map<string, () => void>,
    txRollbackLog?: Array<() => void>,
  ): any {
    if (entity === Dossier) {
      return {
        findOne: jest.fn(async ({ where }: any) => {
          await tick();
          const row = where?.id ? dossiersTable.get(where.id) : undefined;
          if (!row) return null;
          if (where.organizationId && row.organizationId !== where.organizationId) {
            return null;
          }
          if (where.code && row.code !== where.code) return null;
          return { ...row };
        }),
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn(async (entityToSave: any) => {
          await tick();
          const id = entityToSave.id || nextUuid('22222222');
          const current = dossiersTable.get(id);
          if (
            current &&
            entityToSave.version !== undefined &&
            entityToSave.version !== current.version
          ) {
            throw new OptimisticLockVersionMismatchError(
              'Dossier',
              entityToSave.version,
              current.version,
            );
          }
          const snapshot = current ? { ...current } : undefined;
          const saved = {
            ...entityToSave,
            id,
            version: current ? current.version + 1 : 1,
            updatedAt: new Date(),
          } as Dossier;
          dossiersTable.set(id, { ...saved });
          if (txRollbackLog) {
            txRollbackLog.push(() => {
              if (snapshot) dossiersTable.set(id, snapshot);
              else dossiersTable.delete(id);
            });
          }
          return { ...saved };
        }),
        createQueryBuilder: jest.fn(() => {
          let targetId = dossierId;
          let targetOrgId = organizationId;
          let lockMode: string | null = null;
          const qb: any = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            setLock: jest.fn((mode: string) => {
              lockMode = mode;
              return qb;
            }),
            where: jest.fn((_sql: string, params: any) => {
              if (params?.id) targetId = params.id;
              if (params?.dossierId) targetId = params.dossierId;
              if (params?.organizationId) targetOrgId = params.organizationId;
              return qb;
            }),
            andWhere: jest.fn((_sql: string, params: any) => {
              if (params?.organizationId) targetOrgId = params.organizationId;
              if (params?.id) targetId = params.id;
              if (params?.dossierId) targetId = params.dossierId;
              return qb;
            }),
            getOne: jest.fn(async () => {
              if (lockMode === 'pessimistic_write' && txHeldLocks) {
                await acquireLock(txHeldLocks, `dossier:${targetId}`);
              }
              await tick();
              const row = dossiersTable.get(targetId);
              if (!row || row.organizationId !== targetOrgId || row.deletedAt) {
                return null;
              }
              return { ...row };
            }),
          };
          return qb;
        }),
      };
    }

    if (entity === Estimate) {
      return {
        findOne: jest.fn(async ({ where }: any) => {
          await tick();
          const row = where?.id ? estimatesTable.get(where.id) : undefined;
          if (!row || row.deletedAt) return null;
          if (where.organizationId && row.organizationId !== where.organizationId) {
            return null;
          }
          return {
            ...row,
            dossier: dossiersTable.get(row.dossierId)
              ? { ...dossiersTable.get(row.dossierId)! }
              : undefined,
            revenueLines: Array.from(revenueLinesTable.values()).filter(
              (l) => l.estimateId === row.id,
            ),
            costLines: Array.from(costLinesTable.values()).filter(
              (l) => l.estimateId === row.id,
            ),
          };
        }),
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn(async (entityToSave: any) => {
          await tick();
          const id = entityToSave.id || nextUuid('33333333');
          const current = estimatesTable.get(id);
          if (
            current &&
            entityToSave.version !== undefined &&
            entityToSave.version !== current.version
          ) {
            throw new OptimisticLockVersionMismatchError(
              'Estimate',
              entityToSave.version,
              current.version,
            );
          }
          const snapshot = current ? { ...current } : undefined;
          const saved = {
            ...entityToSave,
            id,
            version: current ? current.version + 1 : 1,
            updatedAt: new Date(),
          } as Estimate;
          estimatesTable.set(id, { ...saved });
          if (txRollbackLog) {
            txRollbackLog.push(() => {
              if (snapshot) estimatesTable.set(id, snapshot);
              else estimatesTable.delete(id);
            });
          }
          return { ...saved };
        }),
        createQueryBuilder: jest.fn(() => {
          let targetId: string | undefined;
          let targetDossierId: string | undefined;
          let targetOrgId = organizationId;
          let includeDeleted = false;
          let lockMode: string | null = null;
          const qb: any = {
            setLock: jest.fn((mode: string) => {
              lockMode = mode;
              return qb;
            }),
            withDeleted: jest.fn(() => {
              includeDeleted = true;
              return qb;
            }),
            select: jest.fn().mockReturnThis(),
            where: jest.fn((_sql: string, params: any) => {
              if (params?.id) targetId = params.id;
              if (params?.dossierId) targetDossierId = params.dossierId;
              if (params?.organizationId) targetOrgId = params.organizationId;
              return qb;
            }),
            andWhere: jest.fn((_sql: string, params: any) => {
              if (params?.organizationId) targetOrgId = params.organizationId;
              if (params?.dossierId) targetDossierId = params.dossierId;
              return qb;
            }),
            orderBy: jest.fn().mockReturnThis(),
            getRawOne: jest.fn(async () => {
              await tick();
              const matching = Array.from(estimatesTable.values()).filter(
                (e) =>
                  e.dossierId === targetDossierId &&
                  e.organizationId === targetOrgId &&
                  (includeDeleted || !e.deletedAt),
              );
              const maxVersionNo = matching.reduce(
                (max, item) => Math.max(max, Number(item.versionNo || 0)),
                0,
              );
              return { maxVersionNo: String(maxVersionNo) };
            }),
            getOne: jest.fn(async () => {
              let row: Estimate | undefined;
              if (targetId) {
                if (lockMode === 'pessimistic_write' && txHeldLocks) {
                  await acquireLock(txHeldLocks, `estimate:${targetId}`);
                }
                await tick();
                row = estimatesTable.get(targetId);
              } else if (targetDossierId) {
                const candidates = Array.from(estimatesTable.values())
                  .filter(
                    (e) =>
                      e.dossierId === targetDossierId &&
                      e.organizationId === targetOrgId &&
                      !e.deletedAt,
                  )
                  .sort((a, b) => b.versionNo - a.versionNo);
                row = candidates[0];
                if (row && lockMode === 'pessimistic_write' && txHeldLocks) {
                  await acquireLock(txHeldLocks, `estimate:${row.id}`);
                  row = estimatesTable.get(row.id);
                }
              }
              if (!row || row.organizationId !== targetOrgId || row.deletedAt) {
                return null;
              }
              return { ...row };
            }),
          };
          return qb;
        }),
      };
    }

    if (entity === EstimateRevenueLine) {
      return {
        create: jest.fn((data: any) => ({ ...data })),
        delete: jest.fn(async () => ({ affected: 0 })),
        createQueryBuilder: jest.fn(() => ({
          innerJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(async () => {
            await tick();
            const approvedEstimates = new Set(
              Array.from(estimatesTable.values())
                .filter(
                  (e) =>
                    e.dossierId === dossierId &&
                    e.organizationId === organizationId &&
                    e.status === EstimateStatus.APPROVED,
                )
                .map((e) => e.id),
            );
            const total = Array.from(revenueLinesTable.values())
              .filter(
                (l) =>
                  l.organizationId === organizationId &&
                  approvedEstimates.has(l.estimateId),
              )
              .reduce((sum, l) => sum + Number(l.netAmount || 0), 0);
            return { totalReceivable: String(total) };
          }),
        })),
      };
    }

    if (entity === EstimateCostLine) {
      return {
        create: jest.fn((data: any) => ({ ...data })),
        delete: jest.fn(async () => ({ affected: 0 })),
        createQueryBuilder: jest.fn(() => ({
          innerJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(async () => {
            await tick();
            const approvedEstimates = new Set(
              Array.from(estimatesTable.values())
                .filter(
                  (e) =>
                    e.dossierId === dossierId &&
                    e.organizationId === organizationId &&
                    e.status === EstimateStatus.APPROVED,
                )
                .map((e) => e.id),
            );
            const total = Array.from(costLinesTable.values())
              .filter(
                (l) =>
                  l.organizationId === organizationId &&
                  approvedEstimates.has(l.estimateId),
              )
              .reduce((sum, l) => sum + Number(l.netAmount || 0), 0);
            return { totalCost: String(total) };
          }),
        })),
      };
    }

    if (entity === Payment) {
      return {
        findOne: jest.fn(async ({ where }: any) => {
          await tick();
          const row = where?.id ? paymentsTable.get(where.id) : undefined;
          return row && row.organizationId === where.organizationId
            ? { ...row }
            : null;
        }),
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn(async (entityToSave: any) => {
          await tick();
          const id = entityToSave.id || nextUuid('66666666');
          const snapshot = paymentsTable.get(id);
          const saved = {
            ...entityToSave,
            id,
            createdAt: entityToSave.createdAt || new Date(),
            updatedAt: new Date(),
          } as Payment;
          paymentsTable.set(id, { ...saved });
          if (txRollbackLog) {
            txRollbackLog.push(() => {
              if (snapshot) paymentsTable.set(id, snapshot);
              else paymentsTable.delete(id);
            });
          }
          return { ...saved };
        }),
        createQueryBuilder: jest.fn(() => {
          let targetId: string | undefined;
          let targetOrgId = organizationId;
          let lockMode: string | null = null;
          let sumAlias: string | undefined;
          let directionFilter: PaymentDirection | undefined;
          const qb: any = {
            setLock: jest.fn((mode: string) => {
              lockMode = mode;
              return qb;
            }),
            select: jest.fn((_sel: string, alias?: string) => {
              sumAlias = alias;
              return qb;
            }),
            where: jest.fn((_sql: string, params: any) => {
              if (params?.id) targetId = params.id;
              if (params?.organizationId) targetOrgId = params.organizationId;
              return qb;
            }),
            andWhere: jest.fn((_sql: string, params: any) => {
              if (params?.organizationId) targetOrgId = params.organizationId;
              if (params?.direction) directionFilter = params.direction;
              return qb;
            }),
            getOne: jest.fn(async () => {
              if (targetId && lockMode === 'pessimistic_write' && txHeldLocks) {
                await acquireLock(txHeldLocks, `payment:${targetId}`);
              }
              await tick();
              const row = targetId ? paymentsTable.get(targetId) : undefined;
              return row && row.organizationId === targetOrgId
                ? { ...row }
                : null;
            }),
            getRawOne: jest.fn(async () => {
              await tick();
              const matching = Array.from(paymentsTable.values()).filter(
                (p) =>
                  p.dossierId === dossierId &&
                  p.organizationId === targetOrgId &&
                  p.status !== PaymentStatus.CANCELLED &&
                  (!directionFilter || p.paymentDirection === directionFilter),
              );
              const total = matching.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0,
              );
              return sumAlias
                ? { [sumAlias]: String(total) }
                : { totalPaid: String(total) };
            }),
          };
          return qb;
        }),
      };
    }

    if (entity === ApprovalRequest) {
      return {
        findOne: jest.fn(async () => null),
        create: jest.fn((data: any) => ({ id: nextUuid('77777777'), ...data })),
        save: jest.fn(async (data: any) => {
          approvalsTable.push(data);
          return data;
        }),
      };
    }

    if (entity === WorkflowHistory) {
      return {
        create: jest.fn((data: any) => ({ id: nextUuid('88888888'), ...data })),
        save: jest.fn(async (data: any) => {
          historiesTable.push(data);
          return data;
        }),
      };
    }

    if (entity === DossierChangeRequest) {
      return {
        create: jest.fn((data: any) => ({ id: nextUuid('99999999'), ...data })),
        save: jest.fn(async (data: any) => data),
      };
    }

    return {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => data),
    };
  }

  beforeEach(async () => {
    idCounter = 0;
    lockQueues = new Map();
    dossiersTable = new Map([
      [
        dossierId,
        {
          id: dossierId,
          organizationId,
          code: 'HS-CONC-001',
          name: 'Hồ sơ kiểm thử concurrency',
          customerId: 'cust-1',
          salesUserId,
          operatorUserId,
          status: DossierStatus.IN_REVIEW,
          version: 1,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        } as Dossier,
      ],
    ]);

    estimatesTable = new Map([
      [
        estimateId,
        {
          id: estimateId,
          organizationId,
          dossierId,
          versionNo: 1,
          version: 1,
          status: EstimateStatus.APPROVED,
          currency: 'VND',
          revenueLines: [],
          costLines: [],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        } as unknown as Estimate,
      ],
    ]);

    revenueLinesTable = new Map([
      [
        'rev-1',
        {
          id: 'rev-1',
          organizationId,
          estimateId,
          netAmount: 10_000_000,
          grossAmount: 10_000_000,
        } as EstimateRevenueLine,
      ],
    ]);

    costLinesTable = new Map([
      [
        'cost-1',
        {
          id: 'cost-1',
          organizationId,
          estimateId,
          netAmount: 4_000_000,
          grossAmount: 4_000_000,
        } as EstimateCostLine,
      ],
    ]);

    paymentsTable = new Map();
    approvalsTable = [];
    historiesTable = [];

    const mockDataSource = {
      getRepository: jest.fn((entity: unknown) => buildRepository(entity)),
      transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => {
        const txHeldLocks = new Map<string, () => void>();
        const txRollbackLog: Array<() => void> = [];
        const manager = {
          getRepository: (entity: unknown) =>
            buildRepository(entity, txHeldLocks, txRollbackLog),
        };
        try {
          return await cb(manager);
        } catch (err) {
          for (let i = txRollbackLog.length - 1; i >= 0; i -= 1) {
            txRollbackLog[i]();
          }
          throw err;
        } finally {
          for (const release of txHeldLocks.values()) {
            release();
          }
        }
      }),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        DossiersController,
        EstimatesController,
        PaymentsController,
      ],
      providers: [
        DossiersService,
        DossierWorkflowService,
        EstimatesService,
        PaymentsService,
        DossierAccessPolicyService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Dossier), useValue: buildRepository(Dossier) },
        { provide: getRepositoryToken(Comment), useValue: buildRepository(Comment) },
        {
          provide: getRepositoryToken(Customer),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'cust-1', organizationId }) },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn().mockResolvedValue([{ id: salesUserId }, { id: operatorUserId }]),
          },
        },
        { provide: getRepositoryToken(Estimate), useValue: buildRepository(Estimate) },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: buildRepository(EstimateRevenueLine),
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: buildRepository(EstimateCostLine),
        },
        { provide: getRepositoryToken(Supplier), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Payment), useValue: buildRepository(Payment) },
        {
          provide: DocumentsService,
          useValue: { findByDossier: jest.fn(), uploadForDossier: jest.fn() },
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: NotificationsService,
          useValue: {
            notify: jest.fn().mockResolvedValue(undefined),
            publishOrganizationEvent: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            delByPattern: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    dossiersController = module.get(DossiersController);
    estimatesController = module.get(EstimatesController);
    paymentsController = module.get(PaymentsController);
  });

  it('serializes two concurrent full-debt createPayment requests: one succeeds and one fails with 400 BadRequest without overshooting receivable', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const dto = await pipe.transform(
      {
        amount: 10_000_000,
        paidAt: '2026-05-01',
        paymentDirection: PaymentDirection.CUSTOMER_RECEIPT,
      },
      { type: 'body', metatype: CreatePaymentDto },
    );

    const results = await Promise.allSettled([
      paymentsController.createPayment(adminUser, dossierId, dto),
      paymentsController.createPayment(adminUser, dossierId, dto),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(BadRequestException);

    const totalPaid = Array.from(paymentsTable.values()).reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    expect(totalPaid).toBe(10_000_000);
  });

  it('produces strictly unique sequential versionNo values under parallel estimate creation (including soft-deleted gaps)', async () => {
    estimatesTable.set('soft-deleted-v2', {
      id: 'soft-deleted-v2',
      organizationId,
      dossierId,
      versionNo: 2,
      version: 1,
      status: EstimateStatus.DRAFT,
      deletedAt: new Date('2026-02-01T00:00:00Z'),
    } as unknown as Estimate);

    const created = await Promise.all([
      estimatesController.create(adminUser, { dossierId, currency: 'VND' }),
      estimatesController.create(adminUser, { dossierId, currency: 'VND' }),
      estimatesController.create(adminUser, { dossierId, currency: 'VND' }),
    ]);

    const versionNumbers = created
      .map((item) => item.versionNo)
      .sort((a, b) => a - b);
    expect(versionNumbers).toEqual([3, 4, 5]);
  });

  it('serializes concurrent workflow approvals so one succeeds, bumps version, and the rival gets 409 Conflict without overwriting', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const dto = await pipe.transform(
      { version: 1, note: 'Concurrent approval attempt' },
      { type: 'body', metatype: WorkflowActionDto },
    );

    const results = await Promise.allSettled([
      dossiersController.approve(adminUser, dossierId, dto),
      dossiersController.approve(adminUser, dossierId, dto),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(dossiersTable.get(dossierId)?.status).toBe(DossierStatus.APPROVED);
    expect(dossiersTable.get(dossierId)?.version).toBe(2);
    expect(historiesTable).toHaveLength(1);
  });

  it('rejects stale version updates across ValidationPipe for dossiers and estimates with 409 Conflict and maps OptimisticLockVersionMismatchError in HttpExceptionFilter', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    const freshDossierDto = await pipe.transform(
      { name: 'Updated Fresh', version: 1 },
      { type: 'body', metatype: UpdateDossierDto },
    );
    await dossiersController.update(adminUser, dossierId, freshDossierDto);
    expect(dossiersTable.get(dossierId)?.version).toBe(2);

    const staleDossierDto = await pipe.transform(
      { name: 'Stale Overwrite', version: 1 },
      { type: 'body', metatype: UpdateDossierDto },
    );
    await expect(
      dossiersController.update(adminUser, dossierId, staleDossierDto),
    ).rejects.toThrow(ConflictException);
    expect(dossiersTable.get(dossierId)?.name).toBe('Updated Fresh');

    const currentDossier = dossiersTable.get(dossierId)!;
    dossiersTable.set(dossierId, {
      ...currentDossier,
      status: DossierStatus.APPROVED,
    });

    const freshEstimateDto = await pipe.transform(
      { note: 'Estimate v2 note', version: 1 },
      { type: 'body', metatype: UpdateEstimateDto },
    );
    await estimatesController.update(adminUser, estimateId, freshEstimateDto);
    expect(estimatesTable.get(estimateId)?.version).toBe(2);

    const staleEstimateDto = await pipe.transform(
      { note: 'Stale Estimate Note', version: 1 },
      { type: 'body', metatype: UpdateEstimateDto },
    );
    await expect(
      estimatesController.update(adminUser, estimateId, staleEstimateDto),
    ).rejects.toThrow(ConflictException);
    expect(estimatesTable.get(estimateId)?.note).toBe('Estimate v2 note');

    // HttpExceptionFilter maps OptimisticLockVersionMismatchError -> HTTP 409
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'PATCH', url: `/api/estimates/${estimateId}` }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new OptimisticLockVersionMismatchError('Estimate', 1, 2), host);
    expect(status).toHaveBeenCalledWith(409);
  });
});
