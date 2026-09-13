import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerActivitiesService } from './customer-activities.service';
import { CustomerActivity } from './entities/customer-activity.entity';
import { Customer } from './entities/customer.entity';
import { CustomerActivityType } from '../../common/enums';
import { QueryCustomerActivityDto } from './dto/query-customer-activity.dto';

describe('CustomerActivitiesService', () => {
  let service: CustomerActivitiesService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const activityRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };
  const customerRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerActivitiesService,
        {
          provide: getRepositoryToken(CustomerActivity),
          useValue: activityRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: customerRepository,
        },
      ],
    }).compile();

    service = module.get(CustomerActivitiesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns only paginated activities within the customer tenant scope', async () => {
    customerRepository.findOne.mockResolvedValue({
      id: 'customer-id',
      organizationId: 'organization-id',
    });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([
      [
        {
          id: 'activity-id',
          customerId: 'customer-id',
          type: CustomerActivityType.CALL,
          title: 'Gọi điện chăm sóc khách hàng',
          description: 'Trao đổi nhu cầu',
          occurredAt: new Date('2026-09-13T03:15:00.000Z'),
          actorUserId: 'actor-id',
          actor: {
            id: 'actor-id',
            fullName: 'Nguyễn Thu Hà',
            email: 'ha@skylux.vn',
            avatarUrl: undefined,
            passwordHash: 'must-not-leak',
          },
          metadata: { channel: 'phone' },
          createdAt: new Date('2026-09-13T03:16:00.000Z'),
          updatedAt: new Date('2026-09-13T03:16:00.000Z'),
        },
      ],
      1,
    ]);

    const query: QueryCustomerActivityDto = {
      page: 2,
      limit: 10,
      type: CustomerActivityType.CALL,
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    };

    const result = await service.findByCustomer(
      'organization-id',
      'customer-id',
      query,
    );

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'activity.organizationId = :organizationId',
      { organizationId: 'organization-id' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'activity.customerId = :customerId',
      { customerId: 'customer-id' },
    );
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    expect(result.data[0]).toMatchObject({
      id: 'activity-id',
      title: 'Gọi điện chăm sóc khách hàng',
      description: 'Trao đổi nhu cầu',
      actor: {
        id: 'actor-id',
        fullName: 'Nguyễn Thu Hà',
        email: 'ha@skylux.vn',
      },
    });
    expect(result.data[0].actor).not.toHaveProperty('passwordHash');
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns 404 when the customer is outside the tenant', async () => {
    customerRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findByCustomer('organization-a', 'customer-b', {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(activityRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects an invalid time range before querying activities', async () => {
    customerRepository.findOne.mockResolvedValue({
      id: 'customer-id',
      organizationId: 'organization-id',
    });

    await expect(
      service.findByCustomer('organization-id', 'customer-id', {
        page: 1,
        limit: 20,
        from: '2026-09-30T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(activityRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
