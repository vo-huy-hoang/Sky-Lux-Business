import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
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
    mockRepository.findOne.mockResolvedValue({ id: 'dossier-1' });
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
      code: 'DOS-001',
    });
    mockRepository.create.mockImplementation((value) => value);
    mockRepository.save.mockResolvedValue(savedPayment);
    mockRedisService.delByPattern.mockResolvedValue(undefined);
    mockRepository.createQueryBuilder
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
    mockRepository.findOne.mockResolvedValue({ id: 'dossier-1' });
    mockRepository.createQueryBuilder
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
        getRawOne: jest.fn().mockResolvedValue({ totalReceivable: '201760006' }),
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
    mockRepository.findOne.mockResolvedValue({ id: 'dossier-1' });
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

  function createUser(): CurrentUserPayload {
    return {
      id: 'user-1',
      organizationId: 'org-1',
      employeeCode: 'TEST-001',
      fullName: 'Test User',
      email: 'test@example.com',
      roles: [],
      permissions: [],
    };
  }
});
