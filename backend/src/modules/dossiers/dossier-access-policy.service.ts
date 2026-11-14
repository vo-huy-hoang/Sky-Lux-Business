import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Dossier } from './entities/dossier.entity';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

export interface DossierAccessSubject {
  id: string;
  organizationId: string;
  salesUserId?: string | null;
  operatorUserId?: string | null;
  createdBy?: string | null;
  salesUser?: { organizationId?: string; departmentId?: string | null } | null;
  operatorUser?: { organizationId?: string; departmentId?: string | null } | null;
}

@Injectable()
export class DossierAccessPolicyService {
  constructor(
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
  ) {}

  hasViewAllAccess(user: CurrentUserPayload): boolean {
    const permissions = user.permissions || [];
    const roles = user.roles || [];
    return (
      permissions.includes('dossier.view.all') ||
      permissions.includes('*') ||
      roles.includes('SUPER_ADMIN')
    );
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

