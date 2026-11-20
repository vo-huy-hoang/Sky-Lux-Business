import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Dossier } from './entities/dossier.entity';
import { DossierStatus } from '../../common/enums';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

export interface DossierAccessSubject {
  id: string;
  organizationId: string;
  salesUserId?: string | null;
  operatorUserId?: string | null;
  createdBy?: string | null;
  status?: DossierStatus | string | null;
  salesUser?: { organizationId?: string; departmentId?: string | null } | null;
  operatorUser?: { organizationId?: string; departmentId?: string | null } | null;
}

@Injectable()
export class DossierAccessPolicyService {
  constructor(
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
  ) {}

  /**
   * Single consistent admin resolution rule for dossier management
   */
  isAdmin(user: CurrentUserPayload): boolean {
    const roles = user.roles || [];
    const permissions = user.permissions || [];
    return (
      roles.includes('SUPER_ADMIN') ||
      roles.includes('CEO_ADMIN') ||
      roles.includes('DIRECTOR') ||
      roles.includes('ADMIN') ||
      permissions.includes('*') ||
      permissions.includes('dossier.manage.all')
    );
  }

  hasViewAllAccess(user: CurrentUserPayload): boolean {
    const permissions = user.permissions || [];
    return this.isAdmin(user) || permissions.includes('dossier.view.all');
  }

  canViewDossier(
    user: CurrentUserPayload,
    dossier?: DossierAccessSubject | null,
  ): boolean {
    if (!dossier || dossier.organizationId !== user.organizationId) {
      return false;
    }

    if (this.hasViewAllAccess(user)) {
      return true;
    }

    const permissions = user.permissions || [];
    const isOwnDossier = [
      dossier.salesUserId,
      dossier.operatorUserId,
      dossier.createdBy,
    ].includes(user.id);

    if (permissions.includes('dossier.view.own') && isOwnDossier) {
      return true;
    }

    const salesSameTeam =
      Boolean(user.departmentId) &&
      dossier.salesUser?.departmentId === user.departmentId &&
      (!dossier.salesUser?.organizationId ||
        dossier.salesUser.organizationId === user.organizationId);

    const operatorSameTeam =
      Boolean(user.departmentId) &&
      dossier.operatorUser?.departmentId === user.departmentId &&
      (!dossier.operatorUser?.organizationId ||
        dossier.operatorUser.organizationId === user.organizationId);

    if (
      permissions.includes('dossier.view.team') &&
      (salesSameTeam || operatorSameTeam)
    ) {
      return true;
    }

    return false;
  }

  assertCanViewDossierEntity<T extends DossierAccessSubject>(
    user: CurrentUserPayload,
    dossier: T | null | undefined,
    dossierId: string,
  ): T {
    if (!this.canViewDossier(user, dossier)) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${dossierId}"`);
    }
    return dossier!;
  }

  async assertCanView(
    user: CurrentUserPayload,
    dossierId: string,
  ): Promise<Dossier> {
    const needsTeamRelations =
      !this.hasViewAllAccess(user) &&
      (user.permissions || []).includes('dossier.view.team');

    const dossier = await this.dossierRepository.findOne({
      where: { id: dossierId, organizationId: user.organizationId },
      ...(needsTeamRelations
        ? { relations: { salesUser: true, operatorUser: true } }
        : {}),
    });

    return this.assertCanViewDossierEntity(user, dossier, dossierId);
  }

  assertCanMutate<T extends DossierAccessSubject>(
    user: CurrentUserPayload,
    dossier: T | null | undefined,
    dossierId: string,
  ): T {
    // 1. Anti-enumeration: must pass visibility check first; otherwise 404
    this.assertCanViewDossierEntity(user, dossier, dossierId);

    if (dossier!.status === DossierStatus.LOCKED) {
      throw new BadRequestException('Không thể chỉnh sửa hồ sơ khi đã bị khóa');
    }

    if (this.isAdmin(user)) {
      return dossier!;
    }

    const permissions = user.permissions || [];
    const roles = user.roles || [];
    const isOwner = [
      dossier!.salesUserId,
      dossier!.operatorUserId,
      dossier!.createdBy,
    ].includes(user.id);

    const hasUpdatePerm =
      permissions.includes('dossier.update') ||
      permissions.includes('dossier.manage.all') ||
      permissions.includes('dossier.manage.own');

    const isOperator = roles.includes('OPERATOR');

    if (!hasUpdatePerm || (!isOwner && !isOperator)) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa hồ sơ này');
    }

    return dossier!;
  }

  assertCanDelete<T extends DossierAccessSubject>(
    user: CurrentUserPayload,
    dossier: T | null | undefined,
    dossierId: string,
  ): T {
    // 1. Anti-enumeration: if cannot view or not found, return 404
    this.assertCanViewDossierEntity(user, dossier, dossierId);

    const roles = user.roles || [];
    const isSuperAdmin = roles.includes('SUPER_ADMIN');
    const isAdmin = this.isAdmin(user);
    const isOperator = roles.includes('OPERATOR');
    const isOwner =
      dossier!.salesUserId === user.id ||
      dossier!.operatorUserId === user.id ||
      dossier!.createdBy === user.id;

    if (dossier!.status === DossierStatus.LOCKED) {
      if (!isSuperAdmin) {
        throw new BadRequestException(
          'Không thể xóa hồ sơ khi đang ở trạng thái LOCKED',
        );
      }
    } else if (
      dossier!.status === DossierStatus.APPROVED ||
      dossier!.status === DossierStatus.COMPLETED
    ) {
      if (!isAdmin) {
        throw new BadRequestException(
          `Không thể xóa hồ sơ khi đang ở trạng thái ${dossier!.status}. Chỉ Ban Giám Đốc (CEO) hoặc Quản trị viên mới có quyền.`,
        );
      }
    } else if (
      dossier!.status === DossierStatus.SUBMITTED ||
      dossier!.status === DossierStatus.IN_REVIEW ||
      dossier!.status === DossierStatus.RESUBMITTED
    ) {
      if (!isOwner && !isOperator && !isAdmin) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa hồ sơ đang trong quy trình duyệt',
        );
      }
    } else {
      if (!isOwner && !isOperator && !isAdmin) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa hồ sơ của người khác',
        );
      }
    }

    return dossier!;
  }

  assertCanRestore<T extends DossierAccessSubject>(
    user: CurrentUserPayload,
    dossier: T | null | undefined,
    dossierId: string,
  ): T {
    // 1. Anti-enumeration: if cannot view or not found, return 404
    if (!this.canViewDossier(user, dossier)) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đã xóa với ID "${dossierId}"`,
      );
    }

    const isAdmin = this.isAdmin(user);
    const roles = user.roles || [];
    const isOperator = roles.includes('OPERATOR');
    const isSales = roles.includes('SALES');
    const isOwner =
      dossier!.salesUserId === user.id || dossier!.createdBy === user.id;

    if (isSales && !isAdmin && !isOperator) {
      if (!isOwner) {
        throw new ForbiddenException(
          'Bạn không có quyền khôi phục hồ sơ của người khác',
        );
      }
      if (
        dossier!.status !== DossierStatus.DRAFT &&
        dossier!.status !== DossierStatus.NEED_CHANGES
      ) {
        throw new ForbiddenException(
          'Nhân viên kinh doanh chỉ có quyền khôi phục hồ sơ ở trạng thái nháp',
        );
      }
    } else if (!isAdmin && !isOperator) {
      throw new ForbiddenException('Bạn không có quyền khôi phục hồ sơ này');
    }

    return dossier!;
  }

  assertCanPurge<T extends DossierAccessSubject>(
    user: CurrentUserPayload,
    dossier: T | null | undefined,
    dossierId: string,
  ): T {
    if (!dossier || dossier.organizationId !== user.organizationId) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ trong thùng rác với ID "${dossierId}"`,
      );
    }

    if (!this.isAdmin(user)) {
      throw new ForbiddenException(
        'Chỉ Ban Giám đốc (CEO/Admin) mới có quyền xóa vĩnh viễn hồ sơ',
      );
    }

    return dossier!;
  }

  applyVisibilityScope<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    dossierAlias: string,
    user: CurrentUserPayload,
    options?: {
      salesUserAlias?: string;
      operatorUserAlias?: string;
    },
  ): SelectQueryBuilder<T> {
    if (this.hasViewAllAccess(user)) {
      return queryBuilder;
    }

    const permissions = user.permissions || [];
    const visibilityClauses: string[] = [];
    const visibilityParams: Record<string, string> = {};

    if (permissions.includes('dossier.view.own')) {
      visibilityClauses.push(
        `(${dossierAlias}.salesUserId = :userId OR ${dossierAlias}.operatorUserId = :userId OR ${dossierAlias}.createdBy = :userId)`,
      );
      visibilityParams.userId = user.id;
    }

    if (permissions.includes('dossier.view.team') && user.departmentId) {
      let salesAlias = options?.salesUserAlias;
      let operatorAlias = options?.operatorUserAlias;

      if (
        (!salesAlias || !operatorAlias) &&
        typeof (queryBuilder as unknown as { leftJoin?: unknown }).leftJoin ===
          'function'
      ) {
        salesAlias = salesAlias || `${dossierAlias}PolicySalesUser`;
        operatorAlias = operatorAlias || `${dossierAlias}PolicyOperatorUser`;
        queryBuilder
          .leftJoin(
            `${dossierAlias}.salesUser`,
            salesAlias,
            `${salesAlias}.organizationId = ${dossierAlias}.organizationId`,
          )
          .leftJoin(
            `${dossierAlias}.operatorUser`,
            operatorAlias,
            `${operatorAlias}.organizationId = ${dossierAlias}.organizationId`,
          );
      }

      if (salesAlias && operatorAlias) {
        visibilityClauses.push(
          `(${salesAlias}.departmentId = :departmentId OR ${operatorAlias}.departmentId = :departmentId)`,
        );
      } else {
        visibilityClauses.push(
          `(EXISTS (SELECT 1 FROM users u_team WHERE (u_team.id = ${dossierAlias}.salesUserId OR u_team.id = ${dossierAlias}.operatorUserId) AND u_team.organization_id = ${dossierAlias}.organizationId AND u_team.department_id = :departmentId))`,
        );
      }
      visibilityParams.departmentId = user.departmentId;
    }

    queryBuilder.andWhere(
      visibilityClauses.length > 0
        ? `(${visibilityClauses.join(' OR ')})`
        : '1 = 0',
      visibilityParams,
    );

    return queryBuilder;
  }
}
