import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ApprovalStatus,
  DossierStatus,
  EstimateStatus,
} from '../../common/enums';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { WorkflowHistory } from './entities/workflow-history.entity';
import {
  DossierChangeRequest,
  DossierChangeRequestStatus,
} from './entities/dossier-change-request.entity';
import { WorkflowActionDto } from './dto/workflow-action.dto';
import { RespondChangeRequestDto } from './dto/respond-change-request.dto';
import { WorkflowListQueryDto } from './dto/workflow-list-query.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';
import { RedisService } from '../../common/redis/redis.service';

type WorkflowAction =
  | 'SUBMIT'
  | 'START_REVIEW'
  | 'RETURN_TO_OPERATIONS'
  | 'REQUEST_CHANGES'
  | 'RESUBMIT'
  | 'APPROVE'
  | 'COMPLETE'
  | 'LOCK';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CEO_ADMIN'];

@Injectable()
export class DossierWorkflowService {
  private readonly logger = new Logger(DossierWorkflowService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  submit(user: CurrentUserPayload, dossierId: string, dto: WorkflowActionDto) {
    return this.execute(user, dossierId, dto, 'SUBMIT');
  }

  startReview(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
  ) {
    return this.execute(user, dossierId, dto, 'START_REVIEW');
  }

  returnToOperations(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
  ) {
    return this.execute(user, dossierId, dto, 'RETURN_TO_OPERATIONS');
  }

  requestChanges(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
  ) {
    return this.execute(user, dossierId, dto, 'REQUEST_CHANGES');
  }

  resubmit(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
  ) {
    return this.execute(user, dossierId, dto, 'RESUBMIT');
  }

  approve(user: CurrentUserPayload, dossierId: string, dto: WorkflowActionDto) {
    return this.execute(user, dossierId, dto, 'APPROVE');
  }

  complete(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
  ) {
    return this.execute(user, dossierId, dto, 'COMPLETE');
  }

  lock(user: CurrentUserPayload, dossierId: string, dto: WorkflowActionDto) {
    return this.execute(user, dossierId, dto, 'LOCK');
  }

  async findHistory(
    user: CurrentUserPayload,
    dossierId: string,
    query: WorkflowListQueryDto,
  ) {
    await this.findReadableDossier(user, dossierId);
    const repository = this.dataSource.getRepository(WorkflowHistory);
    const [items, total] = await repository.findAndCount({
      where: { dossierId, organizationId: user.organizationId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return {
      data: items.map((item) => this.historyResponse(item)),
      meta: this.pageMeta(query, total),
    };
  }

  async findApprovals(
    user: CurrentUserPayload,
    dossierId: string,
    query: WorkflowListQueryDto,
  ) {
    await this.findReadableDossier(user, dossierId);
    const repository = this.dataSource.getRepository(ApprovalRequest);
    const [items, total] = await repository.findAndCount({
      where: {
        dossierId,
        organizationId: user.organizationId,
        ...(query.status ? { status: query.status } : {}),
      },
      relations: { reviewer: true },
      order: { requestedAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return {
      data: items.map((item) => this.approvalResponse(item)),
      meta: this.pageMeta(query, total),
    };
  }

  async findChangeRequests(user: CurrentUserPayload, dossierId: string) {
    await this.findReadableDossier(user, dossierId);
    const repository = this.dataSource.getRepository(DossierChangeRequest);
    const items = await repository.find({
      where: { dossierId, organizationId: user.organizationId },
      relations: { requester: true, responder: true },
      order: { requestedAt: 'DESC' },
    });
    return {
      data: items.map((item) => this.changeRequestResponse(item)),
      meta: { total: items.length },
    };
  }

  async respondToChangeRequest(
    user: CurrentUserPayload,
    dossierId: string,
    requestId: string,
    dto: RespondChangeRequestDto,
  ) {
    const dossier = await this.dataSource.getRepository(Dossier).findOne({
      where: { id: dossierId, organizationId: user.organizationId },
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy hồ sơ');

    const isAssignedSales =
      user.roles.includes('SALES') &&
      [dossier.salesUserId, dossier.createdBy].includes(user.id);
    if (!this.isAdmin(user) && !isAssignedSales) {
      throw new ForbiddenException(
        'Chỉ Sales phụ trách hồ sơ mới được trả lời yêu cầu bổ sung',
      );
    }

    const repository = this.dataSource.getRepository(DossierChangeRequest);
    const request = await repository.findOne({
      where: {
        id: requestId,
        dossierId,
        organizationId: user.organizationId,
      },
      relations: { requester: true },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu bổ sung');
    if (request.status !== DossierChangeRequestStatus.OPEN) {
      throw new ConflictException('Yêu cầu bổ sung này đã được trả lời');
    }

    const responseText = dto.responseText.trim();
    if (!responseText) {
      throw new BadRequestException('Nội dung phản hồi không được để trống');
    }
    request.responseText = responseText;
    request.respondedBy = user.id;
    request.respondedAt = new Date();
    request.status = DossierChangeRequestStatus.RESPONDED;
    const saved = await repository.save(request);

    if (
      this.notificationsService &&
      request.requestedBy &&
      request.requestedBy !== user.id
    ) {
      await this.notificationsService.notify({
        organizationId: user.organizationId,
        userId: request.requestedBy,
        title: `Sales đã phản hồi yêu cầu bổ sung hồ sơ ${dossier.code}`,
        content: `${user.fullName || 'Sales'} đã phản hồi: "${responseText}"`,
        type: 'DOSSIER',
        linkUrl: `/dossiers/${dossier.id}`,
        metadata: {
          dossierId: dossier.id,
          changeRequestId: request.id,
          action: 'RESPOND_CHANGE_REQUEST',
        },
      });
    }

    await this.auditLogsService.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AuditAction.DOSSIER_UPDATED,
      entityType: AuditEntityType.DOSSIER,
      entityId: dossier.id,
      afterData: {
        changeRequestId: request.id,
        action: 'RESPOND_CHANGE_REQUEST',
      },
    });

    return {
      data: {
        ...this.changeRequestResponse(saved),
        responder: { id: user.id, fullName: user.fullName },
      },
      meta: {},
    };
  }

  private async execute(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
    action: WorkflowAction,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const dossiers = manager.getRepository(Dossier);
      const estimates = manager.getRepository(Estimate);
      const dossier = await this.findDossierForUpdate(
        dossiers,
        user,
        dossierId,
      );
      this.assertActionPermission(user, dossier, action);
      this.assertTransition(dossier.status, action);

      const estimate = await estimates.findOne({
        where: { dossierId, organizationId: user.organizationId },
        order: { versionNo: 'DESC' },
      });
      if (this.requiresEstimate(action) && !estimate) {
        throw new ConflictException(
          'Hồ sơ cần có dự toán trước khi chuyển workflow',
        );
      }

      const previousStatus = dossier.status;
      const previousOperatorUserId = dossier.operatorUserId;
      this.applyDossierAction(dossier, user, dto, action);
      const savedDossier = await dossiers.save(dossier);
      const savedEstimate = estimate
        ? await this.applyEstimateAction(estimates, estimate, user, action)
        : undefined;

      const changeRequest =
        action === 'REQUEST_CHANGES'
          ? await this.createChangeRequest(
              manager,
              savedDossier,
              user,
              dto.note,
            )
          : undefined;

      await this.updateApproval(
        manager,
        savedDossier,
        savedEstimate,
        user,
        dto.note,
        action,
      );
      await manager.getRepository(WorkflowHistory).save(
        manager.getRepository(WorkflowHistory).create({
          organizationId: user.organizationId,
          dossierId: savedDossier.id,
          estimateId: savedEstimate?.id,
          fromStatus: previousStatus,
          toStatus: savedDossier.status,
          action,
          actorUserId: user.id,
          comment: dto.note,
          metadata: changeRequest
            ? { changeRequestId: changeRequest.id }
            : undefined,
        }),
      );
      return {
        data: this.dossierResponse(savedDossier),
        meta: {},
        savedDossier,
        previousStatus,
        previousOperatorUserId,
        changeRequestId: changeRequest?.id,
      };
    });

    if (this.notificationsService) {
      try {
        await this.dispatchWorkflowNotification(
          result.savedDossier,
          user,
          action,
          dto.note,
          result.changeRequestId,
        );
      } catch (notifErr: any) {
        this.logger.error(
          `Lỗi phát thông báo workflow hồ sơ ${dossierId}: ${notifErr?.message}`,
        );
      }
    }

    await this.auditLogsService.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AuditAction.DOSSIER_STATUS_CHANGED,
      entityType: AuditEntityType.DOSSIER,
      entityId: result.savedDossier.id,
      beforeData: {
        status: result.previousStatus,
        operatorUserId: result.previousOperatorUserId ?? null,
        workflowAction: action,
      },
      afterData: { status: result.savedDossier.status, workflowAction: action },
    });

    if (this.redisService) {
      try {
        await this.redisService.delByPattern(
          `dashboard:*${user.organizationId}*`,
        );
      } catch (cacheErr: any) {
        this.logger.warn(
          `Lỗi xóa cache dashboard khi cập nhật workflow hồ sơ ${dossierId}: ${cacheErr?.message}`,
        );
      }
    }

    return { data: result.data, meta: result.meta };
  }

  private async findDossierForUpdate(
    repository: Repository<Dossier>,
    user: CurrentUserPayload,
    dossierId: string,
  ) {
    const dossier = await repository.findOne({
      where: { id: dossierId, organizationId: user.organizationId },
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy hồ sơ');
    return dossier;
  }

  private async findReadableDossier(
    user: CurrentUserPayload,
    dossierId: string,
  ) {
    const dossier = await this.dataSource.getRepository(Dossier).findOne({
      where: { id: dossierId, organizationId: user.organizationId },
      relations: { salesUser: true, operatorUser: true },
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy hồ sơ');
    const canViewAll =
      this.isAdmin(user) ||
      user.permissions.includes('*') ||
      user.permissions.includes('dossier.view.all');
    const canViewOwn =
      user.permissions.includes('dossier.view.own') &&
      [dossier.salesUserId, dossier.operatorUserId, dossier.createdBy].includes(
        user.id,
      );
    const canViewTeam =
      user.permissions.includes('dossier.view.team') &&
      !!user.departmentId &&
      [
        dossier.salesUser?.departmentId,
        dossier.operatorUser?.departmentId,
      ].includes(user.departmentId);
    if (!canViewAll && !canViewOwn && !canViewTeam)
      throw new ForbiddenException(
        'Bạn không có quyền xem workflow của hồ sơ này',
      );
    return dossier;
  }

  private assertActionPermission(
    user: CurrentUserPayload,
    dossier: Dossier,
    action: WorkflowAction,
  ) {
    if (this.isAdmin(user)) return;
    const isSalesOwner =
      user.roles.includes('SALES') &&
      [dossier.salesUserId, dossier.createdBy].includes(user.id);
    const isAssignedOperator =
      user.roles.includes('OPERATOR') &&
      (!dossier.operatorUserId || dossier.operatorUserId === user.id);
    const allowed =
      action === 'RETURN_TO_OPERATIONS'
        ? false
        : (['SUBMIT', 'RESUBMIT'] as WorkflowAction[]).includes(action)
          ? isSalesOwner
          : action === 'LOCK'
            ? false
            : isAssignedOperator;
    if (!allowed)
      throw new ForbiddenException(
        'Vai trò hiện tại không có quyền thực hiện bước workflow này',
      );
  }

  private assertTransition(status: DossierStatus, action: WorkflowAction) {
    const expected: Record<WorkflowAction, DossierStatus[]> = {
      SUBMIT: [DossierStatus.DRAFT],
      START_REVIEW: [DossierStatus.SUBMITTED, DossierStatus.RESUBMITTED],
      RETURN_TO_OPERATIONS: [DossierStatus.IN_REVIEW],
      REQUEST_CHANGES: [DossierStatus.IN_REVIEW],
      RESUBMIT: [DossierStatus.NEED_CHANGES],
      APPROVE: [DossierStatus.IN_REVIEW],
      COMPLETE: [DossierStatus.APPROVED],
      LOCK: [DossierStatus.APPROVED, DossierStatus.COMPLETED],
    };
    if (!expected[action].includes(status))
      throw new ConflictException(
        `Không thể ${action.toLowerCase()} hồ sơ đang ở trạng thái ${status}`,
      );
  }

  private applyDossierAction(
    dossier: Dossier,
    user: CurrentUserPayload,
    dto: WorkflowActionDto,
    action: WorkflowAction,
  ) {
    if (action === 'SUBMIT') Object.assign(dossier, this.submitFields(dto));
    if (action === 'START_REVIEW' && !dossier.operatorUserId)
      dossier.operatorUserId = user.id;
    const statusByAction: Record<WorkflowAction, DossierStatus> = {
      SUBMIT: DossierStatus.SUBMITTED,
      START_REVIEW: DossierStatus.IN_REVIEW,
      RETURN_TO_OPERATIONS: DossierStatus.SUBMITTED,
      REQUEST_CHANGES: DossierStatus.NEED_CHANGES,
      RESUBMIT: DossierStatus.RESUBMITTED,
      APPROVE: DossierStatus.APPROVED,
      COMPLETE: DossierStatus.COMPLETED,
      LOCK: DossierStatus.LOCKED,
    };
    dossier.status = statusByAction[action];
    if (action === 'LOCK') {
      dossier.lockedAt = new Date();
      dossier.lockedBy = user.id;
    }
  }

  private async applyEstimateAction(
    repository: Repository<Estimate>,
    estimate: Estimate,
    user: CurrentUserPayload,
    action: WorkflowAction,
  ) {
    const statusByAction: Partial<Record<WorkflowAction, EstimateStatus>> = {
      SUBMIT: EstimateStatus.SUBMITTED,
      START_REVIEW: EstimateStatus.IN_REVIEW,
      RETURN_TO_OPERATIONS: EstimateStatus.SUBMITTED,
      REQUEST_CHANGES: EstimateStatus.NEED_CHANGES,
      RESUBMIT: EstimateStatus.SUBMITTED,
      APPROVE: EstimateStatus.APPROVED,
    };
    const status = statusByAction[action];
    if (!status) return estimate;
    estimate.status = status;
    if (status === EstimateStatus.SUBMITTED) {
      estimate.submittedAt = new Date();
      estimate.submittedBy = user.id;
    }
    if (status === EstimateStatus.APPROVED) {
      estimate.approvedAt = new Date();
      estimate.approvedBy = user.id;
    }
    return repository.save(estimate);
  }

  private async updateApproval(
    manager: EntityManager,
    dossier: Dossier,
    estimate: Estimate | undefined,
    user: CurrentUserPayload,
    note: string | undefined,
    action: WorkflowAction,
  ) {
    if (!estimate) return;
    const repository = manager.getRepository(ApprovalRequest);
    if (
      action === 'SUBMIT' ||
      action === 'RESUBMIT' ||
      action === 'RETURN_TO_OPERATIONS'
    ) {
      const pendingApproval =
        action === 'RETURN_TO_OPERATIONS'
          ? await repository.findOne({
              where: {
                dossierId: dossier.id,
                estimateId: estimate.id,
                organizationId: user.organizationId,
                status: ApprovalStatus.PENDING,
              },
              order: { requestedAt: 'DESC' },
            })
          : null;

      if (pendingApproval) {
        pendingApproval.requestedAt = new Date();
        pendingApproval.comment = note;
        await repository.save(pendingApproval);
      } else {
        await repository.save(
          repository.create({
            organizationId: user.organizationId,
            dossierId: dossier.id,
            estimateId: estimate.id,
            stepNo: 1,
            stepCode: 'OPERATOR_REVIEW',
            reviewerUserId: dossier.operatorUserId,
            status: ApprovalStatus.PENDING,
            comment: note,
          }),
        );
      }
      return;
    }
    if (action !== 'REQUEST_CHANGES' && action !== 'APPROVE') return;
    const approval = await repository.findOne({
      where: {
        dossierId: dossier.id,
        estimateId: estimate.id,
        organizationId: user.organizationId,
        status: ApprovalStatus.PENDING,
      },
      order: { requestedAt: 'DESC' },
    });
    if (!approval) return;
    approval.status =
      action === 'APPROVE'
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.CHANGES_REQUESTED;
    approval.decidedAt = new Date();
    approval.comment = note;
    await repository.save(approval);
  }

  private requiresEstimate(action: WorkflowAction) {
    return !(['COMPLETE', 'LOCK'] as WorkflowAction[]).includes(action);
  }

  private submitFields(dto: WorkflowActionDto) {
    return {
      ...(dto.customerId ? { customerId: dto.customerId } : {}),
      ...(dto.operatorUserId ? { operatorUserId: dto.operatorUserId } : {}),
      ...(dto.businessLineId ? { businessLineId: dto.businessLineId } : {}),
      ...(dto.marketTypeId ? { marketTypeId: dto.marketTypeId } : {}),
    };
  }

  private isAdmin(user: CurrentUserPayload) {
    return user.roles.some((role) => ADMIN_ROLES.includes(role));
  }

  private dossierResponse(dossier: Dossier) {
    return {
      id: dossier.id,
      code: dossier.code,
      status: dossier.status,
      createdAt: dossier.createdAt,
      updatedAt: dossier.updatedAt,
    };
  }

  private historyResponse(history: WorkflowHistory) {
    return {
      id: history.id,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      action: history.action,
      comment: history.comment,
      metadata: history.metadata,
      createdAt: history.createdAt,
      actor: history.actor
        ? { id: history.actor.id, fullName: history.actor.fullName }
        : undefined,
    };
  }

  private changeRequestResponse(request: DossierChangeRequest) {
    return {
      id: request.id,
      dossierId: request.dossierId,
      requestText: request.requestText,
      responseText: request.responseText,
      status: request.status,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      requester: request.requester
        ? { id: request.requester.id, fullName: request.requester.fullName }
        : undefined,
      responder: request.responder
        ? { id: request.responder.id, fullName: request.responder.fullName }
        : undefined,
    };
  }

  private async createChangeRequest(
    manager: EntityManager,
    dossier: Dossier,
    user: CurrentUserPayload,
    note?: string,
  ) {
    const repository = manager.getRepository(DossierChangeRequest);
    return repository.save(
      repository.create({
        organizationId: user.organizationId,
        dossierId: dossier.id,
        requestedBy: user.id,
        requestText: note?.trim() || 'Vui lòng kiểm tra và bổ sung lại hồ sơ.',
        status: DossierChangeRequestStatus.OPEN,
        requestedAt: new Date(),
      }),
    );
  }

  private approvalResponse(approval: ApprovalRequest) {
    return {
      id: approval.id,
      estimateId: approval.estimateId,
      stepNo: approval.stepNo,
      stepCode: approval.stepCode,
      status: approval.status,
      requestedAt: approval.requestedAt,
      decidedAt: approval.decidedAt,
      comment: approval.comment,
      reviewer: approval.reviewer
        ? { id: approval.reviewer.id, fullName: approval.reviewer.fullName }
        : undefined,
    };
  }

  private pageMeta(query: WorkflowListQueryDto, total: number) {
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private async dispatchWorkflowNotification(
    dossier: Dossier,
    actor: CurrentUserPayload,
    action: WorkflowAction,
    note?: string,
    changeRequestId?: string,
  ) {
    if (!this.notificationsService) return;

    const linkUrl = `/dossiers/${dossier.id}`;
    const dossierName = dossier.name || dossier.code;

    // 1. SUBMIT / RESUBMIT: Sales submits to Operator
    if (action === 'SUBMIT' || action === 'RESUBMIT') {
      const recipientId = dossier.operatorUserId;
      if (recipientId && recipientId !== actor.id) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: recipientId,
          title: `Hồ sơ ${dossier.code} đã được gửi duyệt`,
          content: `${actor.fullName || 'Nhân viên Sales'} đã gửi hồ sơ "${dossierName}" để thẩm định.`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action },
        });
      }
    }

    if (action === 'RETURN_TO_OPERATIONS') {
      const recipientId = dossier.operatorUserId;
      if (recipientId && recipientId !== actor.id) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: recipientId,
          title: `Hồ sơ ${dossier.code} đã được gửi lại Điều hành`,
          content: `CEO/Admin đã chuyển hồ sơ "${dossierName}" về hàng chờ Điều hành.`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action },
        });
      }
    }

    // 2. START_REVIEW: Operator begins review
    if (action === 'START_REVIEW') {
      const recipientId = dossier.salesUserId;
      if (recipientId && recipientId !== actor.id) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: recipientId,
          title: `Hồ sơ ${dossier.code} đang được thẩm định`,
          content: `Điều hành viên ${actor.fullName || ''} đã tiếp nhận thẩm định hồ sơ "${dossierName}".`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action },
        });
      }
    }

    // 3. REQUEST_CHANGES: notify the assigned Sales and Operator users.
    if (action === 'REQUEST_CHANGES') {
      const recipients = [
        ...new Set(
          [dossier.salesUserId, dossier.operatorUserId].filter(
            (recipientId): recipientId is string =>
              Boolean(recipientId && recipientId !== actor.id),
          ),
        ),
      ];
      const requesterLabel = this.isAdmin(actor)
        ? 'Ban điều hành'
        : 'Điều hành viên';

      for (const recipientId of recipients) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: recipientId,
          title: `Hồ sơ ${dossier.code} yêu cầu điều chỉnh`,
          content: `${requesterLabel} ${actor.fullName || ''} yêu cầu chỉnh sửa: "${note || 'Vui lòng kiểm tra lại dự toán'}".`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action, note, changeRequestId },
        });
      }
    }

    // 4. APPROVE: Operator approves dossier
    if (action === 'APPROVE') {
      const recipientId = dossier.salesUserId;
      if (recipientId && recipientId !== actor.id) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: recipientId,
          title: `Hồ sơ ${dossier.code} đã được phê duyệt`,
          content: `Hồ sơ "${dossierName}" đã được phê duyệt thành công bởi ${actor.fullName || 'Điều hành'}.`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action },
        });
      }
    }

    // 5. COMPLETE: Dossier tour completed
    if (action === 'COMPLETE') {
      const recipients = [dossier.salesUserId, dossier.operatorUserId].filter(
        (id): id is string => Boolean(id && id !== actor.id),
      );
      for (const rId of recipients) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: rId,
          title: `Hồ sơ ${dossier.code} đã hoàn thành`,
          content: `Hồ sơ "${dossierName}" đã được đánh dấu hoàn thành.`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action },
        });
      }
    }

    // 6. LOCK: CEO/Admin locks dossier
    if (action === 'LOCK') {
      const recipients = [dossier.salesUserId, dossier.operatorUserId].filter(
        (id): id is string => Boolean(id && id !== actor.id),
      );
      for (const rId of recipients) {
        await this.notificationsService.notify({
          organizationId: actor.organizationId,
          userId: rId,
          title: `Hồ sơ ${dossier.code} đã được khóa`,
          content: `Hồ sơ "${dossierName}" đã được chốt và khóa bởi ${actor.fullName || 'Ban Giám Đốc'}.`,
          type: 'DOSSIER',
          linkUrl,
          metadata: { dossierId: dossier.id, action },
        });
      }
    }
  }
}
