import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { WorkflowActionDto } from './dto/workflow-action.dto';
import { WorkflowListQueryDto } from './dto/workflow-list-query.dto';

type WorkflowAction =
  | 'SUBMIT'
  | 'START_REVIEW'
  | 'REQUEST_CHANGES'
  | 'RESUBMIT'
  | 'APPROVE'
  | 'COMPLETE'
  | 'LOCK';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CEO_ADMIN'];

@Injectable()
export class DossierWorkflowService {
  constructor(private readonly dataSource: DataSource) {}

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

  private async execute(
    user: CurrentUserPayload,
    dossierId: string,
    dto: WorkflowActionDto,
    action: WorkflowAction,
  ) {
    return this.dataSource.transaction(async (manager) => {
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
      this.applyDossierAction(dossier, user, dto, action);
      const savedDossier = await dossiers.save(dossier);
      const savedEstimate = estimate
        ? await this.applyEstimateAction(estimates, estimate, user, action)
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
        }),
      );
      return { data: this.dossierResponse(savedDossier), meta: {} };
    });
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
    const dossier = await this.findDossierForUpdate(
      this.dataSource.getRepository(Dossier),
      user,
      dossierId,
    );
    const canViewAll =
      this.isAdmin(user) ||
      user.permissions.includes('*') ||
      user.permissions.includes('dossier.view.all');
    const canViewOwn =
      user.permissions.includes('dossier.view.own') &&
      [dossier.salesUserId, dossier.operatorUserId, dossier.createdBy].includes(
        user.id,
      );
    if (!canViewAll && !canViewOwn)
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
    const allowed = (['SUBMIT', 'RESUBMIT'] as WorkflowAction[]).includes(
      action,
    )
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
    if (action === 'SUBMIT' || action === 'RESUBMIT') {
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
      createdAt: history.createdAt,
      actor: history.actor
        ? { id: history.actor.id, fullName: history.actor.fullName }
        : undefined,
    };
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
}
