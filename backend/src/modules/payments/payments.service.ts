import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EstimateStatus,
  PaymentDirection,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
    @InjectRepository(EstimateRevenueLine)
    private readonly revenueLineRepository: Repository<EstimateRevenueLine>,
    private readonly redisService: RedisService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async getPaymentsByDossier(
    user: CurrentUserPayload,
    dossierId: string,
  ): Promise<any> {
    const organizationId = user.organizationId;

    const cacheKey = `skylux:dossiers::api:dossiers:${dossierId}:payments:org:${organizationId}:user:${user.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const dossier = await this.dossierRepository.findOne({
      where: { id: dossierId, organizationId },
    });

    if (!dossier) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${dossierId}"`);
    }

    const payments = await this.paymentRepository.find({
      where: { dossierId, organizationId },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });

    const response = {
      data: payments.map((p) => this.toPaymentResponseDto(p)),
      meta: {
        total: payments.length,
      },
    };

    await this.redisService.set(cacheKey, response, 60);
    return response;
  }

  async getPaymentDetail(user: CurrentUserPayload, id: string): Promise<any> {
    const organizationId = user.organizationId;

    const cacheKey = `skylux:payments::api:payments:${id}:org:${organizationId}:user:${user.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const payment = await this.paymentRepository.findOne({
      where: { id, organizationId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Không tìm thấy khoản thanh toán với ID "${id}"`,
      );
    }

    const response = {
      data: this.toPaymentResponseDto(payment),
      meta: {},
    };

    await this.redisService.set(cacheKey, response, 60);
    return response;
  }

  async createPayment(
    user: CurrentUserPayload,
    dossierId: string,
    dto: CreatePaymentDto,
  ): Promise<any> {
    const organizationId = user.organizationId;

    const dossier = await this.dossierRepository.findOne({
      where: { id: dossierId, organizationId },
    });

    if (!dossier) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${dossierId}"`);
    }

    if (dto.amount < 0) {
      throw new BadRequestException(
        'Số tiền thanh toán phải lớn hơn hoặc bằng 0',
      );
    }

    const paymentDirection =
      dto.paymentDirection || PaymentDirection.CUSTOMER_RECEIPT;
    if (paymentDirection === PaymentDirection.CUSTOMER_RECEIPT) {
      const financeSummary = await this.getFinanceSummary(user, dossierId);
      const remainingDebt = Number(financeSummary.data.remainingDebt || 0);
      if (dto.amount > remainingDebt) {
        throw new BadRequestException(
          `Số tiền thanh toán không được vượt quá công nợ còn lại ${this.formatCurrency(remainingDebt)}.`,
        );
      }
    }

    const payment = this.paymentRepository.create({
      amount: dto.amount,
      dossierId,
      organizationId,
      paymentDate: this.toDateOnly(dto.paidAt),
      paymentMethod:
        (dto.method as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
      paymentDirection,
      status: PaymentStatus.PAID,
      referenceCode: dto.referenceCode,
      note: dto.note,
      createdBy: user.id,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    await this.invalidateCaches(
      dossierId,
      savedPayment.id,
      organizationId,
      user.id,
    );

    this.notificationsService?.publishOrganizationEvent({
      type: 'payment.updated',
      organizationId,
      data: { dossierId, paymentId: savedPayment.id },
    });

    if (
      this.notificationsService &&
      dossier.salesUserId &&
      dossier.salesUserId !== user.id
    ) {
      try {
        await this.notificationsService.notify({
          organizationId,
          userId: dossier.salesUserId,
          title: `Hồ sơ ${dossier.code} vừa được thanh toán`,
          content: `Một khoản thanh toán trị giá ${this.formatCurrency(savedPayment.amount)} vừa được cập nhật cho hồ sơ ${dossier.code}.`,
          type: 'DOSSIER',
          linkUrl: `/main/dossiers/${dossierId}`,
          metadata: { dossierId, paymentId: savedPayment.id },
        });
      } catch {
        // Ignore notification errors
      }
    }

    return {
      data: this.toPaymentResponseDto(savedPayment),
      meta: {},
    };
  }

  async updatePayment(
    user: CurrentUserPayload,
    id: string,
    dto: UpdatePaymentDto,
  ): Promise<any> {
    const organizationId = user.organizationId;

    const payment = await this.paymentRepository.findOne({
      where: { id, organizationId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Không tìm thấy khoản thanh toán với ID "${id}"`,
      );
    }

    if (dto.amount !== undefined && dto.amount < 0) {
      throw new BadRequestException(
        'Số tiền thanh toán phải lớn hơn hoặc bằng 0',
      );
    }

    const nextAmount =
      dto.amount !== undefined ? dto.amount : Number(payment.amount);
    const nextDirection = dto.paymentDirection || payment.paymentDirection;
    if (nextDirection === PaymentDirection.CUSTOMER_RECEIPT) {
      const financeSummary = await this.getFinanceSummary(
        user,
        payment.dossierId,
      );
      const paidWithoutCurrent = Math.max(
        Number(financeSummary.data.totalPaid || 0) -
          (payment.paymentDirection === PaymentDirection.CUSTOMER_RECEIPT &&
          payment.status !== PaymentStatus.CANCELLED
            ? Number(payment.amount || 0)
            : 0),
        0,
      );
      const remainingForCurrent = Math.max(
        Number(financeSummary.data.totalReceivable || 0) - paidWithoutCurrent,
        0,
      );
      if (nextAmount > remainingForCurrent) {
        throw new BadRequestException(
          `Số tiền thanh toán không được vượt quá công nợ còn lại ${this.formatCurrency(remainingForCurrent)}.`,
        );
      }
    }

    if (dto.amount !== undefined) payment.amount = dto.amount;
    if (dto.paidAt !== undefined)
      payment.paymentDate = this.toDateOnly(dto.paidAt);
    if (dto.method !== undefined)
      payment.paymentMethod = dto.method as PaymentMethod;
    if (dto.paymentDirection !== undefined)
      payment.paymentDirection = dto.paymentDirection;
    if (dto.referenceCode !== undefined)
      payment.referenceCode = dto.referenceCode;
    if (dto.note !== undefined) payment.note = dto.note;

    const savedPayment = await this.paymentRepository.save(payment);

    await this.invalidateCaches(
      savedPayment.dossierId,
      savedPayment.id,
      organizationId,
      user.id,
    );

    this.notificationsService?.publishOrganizationEvent({
      type: 'payment.updated',
      organizationId,
      data: { dossierId: savedPayment.dossierId, paymentId: savedPayment.id },
    });

    return {
      data: this.toPaymentResponseDto(savedPayment),
      meta: {},
    };
  }

  async getFinanceSummary(
    user: CurrentUserPayload,
    dossierId: string,
  ): Promise<any> {
    const organizationId = user.organizationId;

    const dossier = await this.dossierRepository.findOne({
      where: { id: dossierId, organizationId },
    });

    if (!dossier) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${dossierId}"`);
    }

    const { totalPaid } =
      (await this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'totalPaid')
        .where('payment.dossier_id = :dossierId', { dossierId })
        .andWhere('payment.organization_id = :organizationId', {
          organizationId,
        })
        .andWhere('payment.payment_direction = :direction', {
          direction: PaymentDirection.CUSTOMER_RECEIPT,
        })
        .andWhere('payment.status != :cancelledStatus', {
          cancelledStatus: PaymentStatus.CANCELLED,
        })
        .getRawOne()) || {};

    const { totalCost } =
      (await this.costLineRepository
        .createQueryBuilder('estimate')
        .innerJoin('estimate.estimate', 'estimateHeader')
        .select('COALESCE(SUM(estimate.netAmount), 0)', 'totalCost')
        .where('estimate.organizationId = :organizationId', { organizationId })
        .andWhere('estimateHeader.dossierId = :dossierId', { dossierId })
        .andWhere('estimateHeader.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('estimateHeader.status = :estimateStatus', {
          estimateStatus: EstimateStatus.APPROVED,
        })
        .getRawOne()) || {};

    const { totalReceivable } =
      (await this.revenueLineRepository
        .createQueryBuilder('estimate')
        .innerJoin('estimate.estimate', 'estimateHeader')
        .select('COALESCE(SUM(estimate.netAmount), 0)', 'totalReceivable')
        .where('estimate.organizationId = :organizationId', { organizationId })
        .andWhere('estimateHeader.dossierId = :dossierId', { dossierId })
        .andWhere('estimateHeader.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('estimateHeader.status = :estimateStatus', {
          estimateStatus: EstimateStatus.APPROVED,
        })
        .getRawOne()) || {};

    const parsedTotalPaid = Number(
      (totalPaid as string | number | null | undefined) ?? 0,
    );
    const parsedTotalCost = Number(
      (totalCost as string | number | null | undefined) ?? 0,
    );
    const parsedTotalReceivable = Number(
      (totalReceivable as string | number | null | undefined) ?? 0,
    );
    const remainingDebt = Math.max(parsedTotalReceivable - parsedTotalPaid, 0);

    const summary = {
      dossierId: dossier.id,
      totalCost: parsedTotalCost,
      totalReceivable: parsedTotalReceivable,
      totalPaid: parsedTotalPaid,
      remainingDebt: remainingDebt,
      lastCalculatedAt: new Date(),
    };

    const response = {
      data: summary,
      meta: {},
    };

    return response;
  }

  private async invalidateCaches(
    dossierId: string,
    paymentId: string,
    organizationId: string,
    userId: string,
  ) {
    await Promise.all([
      this.redisService.del(
        `skylux:dossiers::api:dossiers:${dossierId}:payments:org:${organizationId}:user:${userId}`,
      ),
      this.redisService.del(
        `skylux:dossiers::api:dossiers:${dossierId}:finance-summary:org:${organizationId}:user:${userId}`,
      ),
    ]);
    await this.redisService.delByPattern(
      `skylux:dossiers::api:dossiers:${dossierId}:payments:org:${organizationId}:*`,
    );
    await this.redisService.delByPattern(
      `skylux:dossiers::api:dossiers:${dossierId}:finance-summary:org:${organizationId}:*`,
    );
    await this.redisService.delByPattern(
      `skylux:payments::api:payments:${paymentId}:org:${organizationId}:*`,
    );
  }

  private toPaymentResponseDto(payment: Payment): any {
    return {
      id: payment.id,
      organizationId: payment.organizationId,
      dossierId: payment.dossierId,
      amount: Number(payment.amount),
      // Keep the existing FE contract while exposing the canonical fields.
      paidAt: payment.paymentDate,
      method: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentDirection: payment.paymentDirection,
      status: payment.status,
      dueDate: payment.dueDate,
      documentId: payment.documentId,
      referenceCode: payment.referenceCode,
      note: payment.note,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      createdBy: payment.createdBy,
    };
  }

  private toDateOnly(value?: string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    return new Date(value).toISOString().slice(0, 10);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}
