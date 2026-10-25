import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRequest } from './entities/approval-request.entity';
import { WorkflowListQueryDto } from './dto/workflow-list-query.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
  ) {}

  async findAll(
    organizationId: string,
    userId: string,
    query: WorkflowListQueryDto,
  ) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const qb = this.approvalRepository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.dossier', 'dossier')
      .leftJoinAndSelect('approval.estimate', 'estimate')
      .leftJoinAndSelect('approval.reviewer', 'reviewer')
      .where('approval.organizationId = :organizationId', { organizationId })
      .andWhere(
        '(approval.reviewerUserId = :userId OR approval.reviewerUserId IS NULL)',
        { userId },
      );
    if (query.status)
      qb.andWhere('approval.status = :status', { status: query.status });
    qb.orderBy('approval.requestedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return {
      data: items.map((item) => this.toResponse(item)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(organizationId: string, userId: string, id: string) {
    const item = await this.approvalRepository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.dossier', 'dossier')
      .leftJoinAndSelect('approval.estimate', 'estimate')
      .leftJoinAndSelect('approval.reviewer', 'reviewer')
      .where('approval.id = :id', { id })
      .andWhere('approval.organizationId = :organizationId', { organizationId })
      .andWhere(
        '(approval.reviewerUserId = :userId OR approval.reviewerUserId IS NULL)',
        { userId },
      )
      .getOne();
    if (!item) throw new NotFoundException('Không tìm thấy yêu cầu phê duyệt');
    return { data: this.toResponse(item) };
  }

  private toResponse(item: ApprovalRequest) {
    return {
      id: item.id,
      dossierId: item.dossierId,
      estimateId: item.estimateId,
      stepNo: item.stepNo,
      stepCode: item.stepCode,
      reviewerUserId: item.reviewerUserId,
      reviewer: item.reviewer
        ? {
            id: item.reviewer.id,
            fullName: item.reviewer.fullName,
            email: item.reviewer.email,
          }
        : undefined,
      status: item.status,
      requestedAt: item.requestedAt,
      decidedAt: item.decidedAt,
      comment: item.comment,
      dossier: item.dossier
        ? {
            id: item.dossier.id,
            code: item.dossier.code,
            name: item.dossier.name,
          }
        : undefined,
      estimate: item.estimate
        ? {
            id: item.estimate.id,
            versionNo: item.estimate.versionNo,
            status: item.estimate.status,
          }
        : undefined,
    };
  }
}
