import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsService } from './payments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DossierAccessPolicyService } from '../dossiers/dossier-access-policy.service';
import {
  PaymentDirection,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn((): any => ({
      setLock: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
    })),
  };

  let mockDataSource: {
    transaction: jest.Mock;
    manager: { getRepository: jest.Mock };
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource = {
      manager: {
        getRepository: jest.fn(() => mockRepository),
      },
      transaction: jest.fn(async (cb: any) =>
        cb({
          getRepository: jest.fn(() => mockRepository),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        DossierAccessPolicyService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: mockRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: NotificationsService,
          useValue: {
            notify: jest.fn(),
            publishOrganizationEvent: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists payments using the schema-backed payment date and maps the FE aliases', async () => {
    const user = createUser();
    const payment = {
      id: 'payment-1',
      organizationId: 'org-1',
      dossierId: 'dossier-1',
      amount: '100000',
      paymentDate: '2026-09-07',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDirection: PaymentDirection.CUSTOMER_RECEIPT,
      status: PaymentStatus.PAID,
      createdAt: new Date('2026-09-07T10:00:00Z'),
      updatedAt: new Date('2026-09-07T10:00:00Z'),
    } as unknown as Payment;

    mockRedisService.get.mockResolvedValue(null);
    mockRepository.findOne.mockResolvedValue({
      id: 'dossier-1',
      organizationId: 'org-1',
    });
    mockRepository.find.mockResolvedValue([payment]);

    const result = await service.getPaymentsByDossier(user, 'dossier-1');

    expect(mockRepository.find).toHaveBeenCalledWith({
      where: { dossierId: 'dossier-1', organizationId: 'org-1' },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
    expect(result.data[0]).toMatchObject({
      paidAt: '2026-09-07',
      method: PaymentMethod.BANK_TRANSFER,
      paymentDate: '2026-09-07',
      status: PaymentStatus.PAID,
    });
  });

  it('creates a customer receipt without relying on paid_at/method columns', async () => {
    const user = createUser();
    const savedPayment = {
      id: 'payment-1',
      dossierId: 'dossier-1',
      organizationId: 'org-1',
      amount: 100000,
      paymentDate: '2026-09-07',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDirection: PaymentDirection.CUSTOMER_RECEIPT,
      status: PaymentStatus.PAID,
    } as Payment;

    mockRepository.findOne.mockResolvedValue({
      id: 'dossier-1',
      organizationId: 'org-1',
      code: 'DOS-001',
    });
    mockRepository.create.mockImplementation((value) => value);
    mockRepository.save.mockResolvedValue(savedPayment);
    mockRedisService.delByPattern.mockResolvedValue(undefined);
    mockRepository.createQueryBuilder
      .mockReturnValueOnce({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'dossier-1',
          organizationId: 'org-1',
          code: 'DOS-001',
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalPaid: '0' }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalCost: '250000' }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalReceivable: '400000' }),
      });

    const result = await service.createPayment(user, 'dossier-1', {
      amount: 100000,
      paidAt: '2026-09-07T10:00:00Z',
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentDate: '2026-09-07',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentDirection: PaymentDirection.CUSTOMER_RECEIPT,
        status: PaymentStatus.PAID,
      }),
    );
    expect(result.data.id).toBe('payment-1');
  });

  it('rejects a customer receipt that exceeds the remaining receivable', async () => {
    const user = createUser();
    mockRepository.findOne.mockResolvedValue({
      id: 'dossier-1',
      organizationId: 'org-1',
    });
    mockRepository.createQueryBuilder
      .mockReturnValueOnce({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'dossier-1',
          organizationId: 'org-1',
          code: 'DOS-001',
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalPaid: '0' }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalCost: '100000' }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalReceivable: '201760006' }),
      });

    await expect(
      service.createPayment(user, 'dossier-1', { amount: 250000000 }),
    ).rejects.toThrow('không được vượt quá công nợ còn lại');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('calculates finance summary from approved estimate cost lines and customer receipts', async () => {
    const user = createUser();
    const paymentQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ totalPaid: '100000' }),
    };
    const costQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ totalCost: '250000' }),
    };
    const revenueQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ totalReceivable: '400000' }),
    };

    mockRedisService.get.mockResolvedValue(null);
    mockRepository.findOne.mockResolvedValue({
      id: 'dossier-1',
      organizationId: 'org-1',
    });
    mockRepository.createQueryBuilder
      .mockReturnValueOnce(paymentQueryBuilder)
      .mockReturnValueOnce(costQueryBuilder)
      .mockReturnValueOnce(revenueQueryBuilder);

    const result = await service.getFinanceSummary(user, 'dossier-1');

    expect(paymentQueryBuilder.andWhere).toHaveBeenCalledWith(
      'payment.payment_direction = :direction',
      { direction: PaymentDirection.CUSTOMER_RECEIPT },
    );
    expect(costQueryBuilder.innerJoin).toHaveBeenCalledWith(
      'estimate.estimate',
      'estimateHeader',
    );
    expect(result.data).toMatchObject({
      totalCost: 250000,
      totalReceivable: 400000,
      totalPaid: 100000,
      remainingDebt: 300000,
    });
  });

  describe('DossierAccessPolicy BOLA protection (Ticket 02)', () => {
    const salesOwnUser: CurrentUserPayload = {
      id: 'sales-1',
      organizationId: 'org-1',
      employeeCode: 'SALES-01',
      fullName: 'Sales One',
      email: 'sales1@skylux.vn',
      roles: ['SALES'],
      permissions: ['dossier.view.own', 'finance.view'],
      departmentId: 'dept-1',
    };

    const colleagueDossier = {
      id: 'dossier-colleague',
      organizationId: 'org-1',
      salesUserId: 'sales-2',
      operatorUserId: 'op-2',
      createdBy: 'sales-2',
      salesUser: { organizationId: 'org-1', departmentId: 'dept-2' },
      operatorUser: { organizationId: 'org-1', departmentId: 'dept-2' },
    };

    it('denies getPaymentsByDossier when SALES (own scope) requests a colleague dossier', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(colleagueDossier);

      await expect(
        service.getPaymentsByDossier(salesOwnUser, 'dossier-colleague'),
      ).rejects.toThrow('Không tìm thấy hồ sơ');
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('denies getFinanceSummary when SALES (own scope) requests a colleague dossier', async () => {
      mockRepository.findOne.mockResolvedValue(colleagueDossier);

      await expect(
        service.getFinanceSummary(salesOwnUser, 'dossier-colleague'),
      ).rejects.toThrow('Không tìm thấy hồ sơ');
    });

    it('denies getPaymentDetail when SALES (own scope) requests a payment of a colleague dossier', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRepository.findOne
        .mockResolvedValueOnce({
          id: 'payment-colleague',
          organizationId: 'org-1',
          dossierId: 'dossier-colleague',
          amount: 500000,
        })
        .mockResolvedValueOnce(colleagueDossier);

      await expect(
        service.getPaymentDetail(salesOwnUser, 'payment-colleague'),
      ).rejects.toThrow('Không tìm thấy hồ sơ');
    });

    it('allows same-department dossier for dossier.view.team and denies different department', async () => {
      const teamUser: CurrentUserPayload = {
        ...salesOwnUser,
        id: 'team-lead',
        permissions: ['dossier.view.team', 'finance.view'],
        departmentId: 'dept-1',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValueOnce({
        id: 'dossier-same-dept',
        organizationId: 'org-1',
        salesUserId: 'sales-2',
        salesUser: { organizationId: 'org-1', departmentId: 'dept-1' },
        operatorUser: null,
      });
      mockRepository.find.mockResolvedValueOnce([]);

      await expect(
        service.getPaymentsByDossier(teamUser, 'dossier-same-dept'),
      ).resolves.toEqual({ data: [], meta: { total: 0 } });

      mockRepository.findOne.mockResolvedValueOnce(colleagueDossier);
      await expect(
        service.getPaymentsByDossier(teamUser, 'dossier-colleague'),
      ).rejects.toThrow('Không tìm thấy hồ sơ');
    });
  });

  describe('Transactional Pessimistic Locking (Ticket 06)', () => {
    it('serializes two concurrent createPayment requests for full remaining debt so only one succeeds and the second fails with 400', async () => {
      const user = createUser();
      const totalReceivable = 400000;
      const committedPayments: Array<{
        id: string;
        amount: number;
        dossierId: string;
        organizationId: string;
        paymentDirection: PaymentDirection;
        status: PaymentStatus;
      }> = [];

      let mutexChain: Promise<void> = Promise.resolve();
      const acquireDossierLock = async () => {
        let release!: () => void;
        const previous = mutexChain;
        mutexChain = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        return release;
      };

      mockDossierRepositoryForTx();

      function mockDossierRepositoryForTx() {
        mockRepository.findOne.mockResolvedValue({
          id: 'dossier-1',
          organizationId: 'org-1',
          code: 'DOS-001',
        });

        mockDataSource.transaction.mockImplementation(async (cb: any) => {
          let releaseLock: (() => void) | undefined;
          const pendingWrites: Array<typeof committedPayments[number]> = [];

          const txDossierRepo = {
            createQueryBuilder: jest.fn(() => ({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn(async () => {
                releaseLock = await acquireDossierLock();
                return {
                  id: 'dossier-1',
                  organizationId: 'org-1',
                  code: 'DOS-001',
                };
              }),
            })),
          };

          const txPaymentRepo = {
            create: jest.fn((data: any) => ({ ...data })),
            save: jest.fn(async (data: any) => {
              const saved = {
                ...data,
                id: `payment-${committedPayments.length + pendingWrites.length + 1}`,
              };
              pendingWrites.push(saved);
              return saved;
            }),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(async () => {
                // Force async yield so concurrent callers without lock interleave here
                await new Promise((r) => setTimeout(r, 15));
                const totalPaid = committedPayments.reduce(
                  (sum, p) => sum + Number(p.amount),
                  0,
                );
                return { totalPaid: String(totalPaid) };
              }),
            })),
          };

          const txCostRepo = {
            createQueryBuilder: jest.fn(() => ({
              innerJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(async () => ({ totalCost: '250000' })),
            })),
          };

          const txRevenueRepo = {
            createQueryBuilder: jest.fn(() => ({
              innerJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(async () => ({
                totalReceivable: String(totalReceivable),
              })),
            })),
          };

          const manager = {
            getRepository: jest.fn((entity: any) => {
              if (entity === Dossier) return txDossierRepo;
              if (entity === Payment) return txPaymentRepo;
              if (entity === EstimateCostLine) return txCostRepo;
              if (entity === EstimateRevenueLine) return txRevenueRepo;
              return mockRepository;
            }),
          };

          try {
            const result = await cb(manager);
            committedPayments.push(...pendingWrites);
            return result;
          } finally {
            releaseLock?.();
          }
        });
      }

      const [firstResult, secondResult] = await Promise.allSettled([
        service.createPayment(user, 'dossier-1', { amount: 400000 }),
        service.createPayment(user, 'dossier-1', { amount: 400000 }),
      ]);

      const fulfilled = [firstResult, secondResult].filter(
        (r) => r.status === 'fulfilled',
      );
      const rejected = [firstResult, secondResult].filter(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult[];

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(2);
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect(
        committedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      ).toBe(400000);
    });

    it('re-checks remaining debt inside transaction during updatePayment and rejects over-receivable updates', async () => {
      const user = createUser();

      mockRepository.findOne
        .mockResolvedValueOnce({
          id: 'payment-1',
          organizationId: 'org-1',
          dossierId: 'dossier-1',
          amount: 100000,
          paymentDirection: PaymentDirection.CUSTOMER_RECEIPT,
          status: PaymentStatus.PAID,
        })
        .mockResolvedValueOnce({
          id: 'dossier-1',
          organizationId: 'org-1',
          code: 'DOS-001',
        });

      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const txDossierRepo = {
          createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({
              id: 'dossier-1',
              organizationId: 'org-1',
            }),
          })),
        };

        const txPaymentRepo = {
          createQueryBuilder: jest.fn((alias: string) => {
            if (alias === 'payment') {
              return {
                setLock: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({
                  id: 'payment-1',
                  organizationId: 'org-1',
                  dossierId: 'dossier-1',
                  amount: 100000,
                  paymentDirection: PaymentDirection.CUSTOMER_RECEIPT,
                  status: PaymentStatus.PAID,
                }),
                getRawOne: jest.fn().mockResolvedValue({ totalPaid: '150000' }),
              };
            }
            return mockRepository.createQueryBuilder();
          }),
          save: jest.fn(async (p: any) => p),
        };

        const txCostRepo = {
          createQueryBuilder: jest.fn(() => ({
            innerJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ totalCost: '100000' }),
          })),
        };

        const txRevenueRepo = {
          createQueryBuilder: jest.fn(() => ({
            innerJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest
              .fn()
              .mockResolvedValue({ totalReceivable: '200000' }),
          })),
        };

        return cb({
          getRepository: jest.fn((entity: any) => {
            if (entity === Dossier) return txDossierRepo;
            if (entity === Payment) return txPaymentRepo;
            if (entity === EstimateCostLine) return txCostRepo;
            if (entity === EstimateRevenueLine) return txRevenueRepo;
            return mockRepository;
          }),
        });
      });

      // totalReceivable=200k, totalPaid=150k, current payment=100k -> other paid=50k -> max allowed=150k
      // Updating current payment to 160k must fail with 400 inside transaction!
      await expect(
        service.updatePayment(user, 'payment-1', { amount: 160000 }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  function createUser(): CurrentUserPayload {
    return {
      id: 'user-1',
      organizationId: 'org-1',
      employeeCode: 'TEST-001',
      fullName: 'Test User',
      email: 'test@example.com',
      roles: ['OPERATOR'],
      permissions: ['dossier.view.all', 'finance.view', 'finance.manage'],
    };
  }
});
