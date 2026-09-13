import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { toPublicUser } from '../../common/utils/public-user';
import { Customer } from './entities/customer.entity';
import { CustomerActivity } from './entities/customer-activity.entity';
import { QueryCustomerActivityDto } from './dto/query-customer-activity.dto';

export interface CustomerActivityResponse {
  id: string;
  customerId: string;
  type: string;
  title: string;
  description?: string;
  occurredAt: Date;
  actorUserId?: string;
  actor?: {
    id: string;
    fullName: string;
    email?: string;
    avatarUrl?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomerActivitiesService {
  constructor(
    @InjectRepository(CustomerActivity)
    private readonly activityRepository: Repository<CustomerActivity>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findByCustomer(
    organizationId: string,
    customerId: string,
    queryDto: QueryCustomerActivityDto,
  ): Promise<PaginatedResponse<CustomerActivityResponse>> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Không tìm thấy khách hàng với ID "${customerId}" trong doanh nghiệp của bạn`,
      );
    }

    const { page, limit, type, from, to } = queryDto;
    if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
      throw new BadRequestException(
        'Khoảng thời gian không hợp lệ: from phải nhỏ hơn hoặc bằng to',
      );
    }

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .where('activity.organizationId = :organizationId', { organizationId })
      .andWhere('activity.customerId = :customerId', { customerId });

    if (type) {
      queryBuilder.andWhere('activity.type = :type', { type });
    }

    if (from) {
      queryBuilder.andWhere('activity.occurredAt >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('activity.occurredAt <= :to', { to });
    }

    queryBuilder
      .orderBy('activity.occurredAt', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items.map((activity) => this.toResponse(activity)),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toResponse(activity: CustomerActivity): CustomerActivityResponse {
    const actor = toPublicUser(activity.actor);

    return {
      id: activity.id,
      customerId: activity.customerId,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      occurredAt: activity.occurredAt,
      actorUserId: activity.actorUserId,
      actor: actor
        ? {
            id: actor.id,
            fullName: actor.fullName,
            email: actor.email,
            avatarUrl: actor.avatarUrl,
          }
        : undefined,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  }
}
