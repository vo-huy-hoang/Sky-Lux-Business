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
import { Estimate } from '../estimates/entities/estimate.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
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
      order: { paidAt: 'DESC', createdAt: 'DESC' },
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

    const payment = this.paymentRepository.create({
      ...dto,
      dossierId,
      organizationId,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      createdBy: user.id,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    await this.invalidateCaches(dossierId, savedPayment.id, organizationId);

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
      } catch (e) {
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

    if (dto.amount !== undefined) payment.amount = dto.amount;
    if (dto.paidAt !== undefined) payment.paidAt = new Date(dto.paidAt);
    if (dto.method !== undefined) payment.method = dto.method;
    if (dto.referenceCode !== undefined)
      payment.referenceCode = dto.referenceCode;
    if (dto.note !== undefined) payment.note = dto.note;

    payment.updatedBy = user.id;

    const savedPayment = await this.paymentRepository.save(payment);

    await this.invalidateCaches(
      savedPayment.dossierId,
      savedPayment.id,
      organizationId,
    );

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

    const cacheKey = `skylux:dossiers::api:dossiers:${dossierId}:finance-summary:org:${organizationId}:user:${user.id}`;
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

    const { totalPaid } = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalPaid')
      .where('payment.dossier_id = :dossierId', { dossierId })
      .andWhere('payment.organization_id = :organizationId', { organizationId })
      .getRawOne();

    const { totalCost } = await this.estimateRepository
      .createQueryBuilder('estimate')
      .select('SUM(estimate.price * estimate.quantity)', 'totalCost')
      .where('estimate.dossier_id = :dossierId', { dossierId })
      .andWhere('estimate.organization_id = :organizationId', {
        organizationId,
      })
      .andWhere('estimate.is_active = true') // Adjust based on your schema logic
      .getRawOne();

    const parsedTotalPaid = parseFloat(totalPaid || '0');
    const parsedTotalCost = parseFloat(totalCost || '0');
    const remainingDebt = parsedTotalCost - parsedTotalPaid;

    const summary = {
      dossierId: dossier.id,
      totalCost: parsedTotalCost,
      totalPaid: parsedTotalPaid,
      remainingDebt: remainingDebt,
      lastCalculatedAt: new Date(),
    };

    const response = {
      data: summary,
      meta: {},
    };

    await this.redisService.set(cacheKey, response, 60);
    return response;
  }

  private async invalidateCaches(
    dossierId: string,
    paymentId: string,
    organizationId: string,
  ) {
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
      paidAt: payment.paidAt,
      method: payment.method,
      referenceCode: payment.referenceCode,
      note: payment.note,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      createdBy: payment.createdBy,
      updatedBy: payment.updatedBy,
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}
