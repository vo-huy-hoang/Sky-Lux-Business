import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { SettingsService } from '../settings/settings.service';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll(): Promise<Organization[]> {
    return this.orgRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const code = dto.code.trim().toUpperCase();
    const slug = dto.slug.trim().toLowerCase();
    const duplicate = await this.orgRepository.findOne({
      where: [{ code }, { slug }],
    });
    if (duplicate) {
      throw new ConflictException('Mã hoặc slug tổ chức đã tồn tại');
    }

    const organization = await this.orgRepository.save(
      this.orgRepository.create({
        ...dto,
        code,
        slug,
        name: dto.name.trim(),
        timezone: dto.timezone ?? 'Asia/Ho_Chi_Minh',
        currency: dto.currency?.trim().toUpperCase() ?? 'VND',
        status: 'ACTIVE',
      }),
    );

    // Every organization needs its own role records and permission grants.
    // Copy the role template from the first configured organization.
    const templates = await this.roleRepository.find({
      relations: { rolePermissions: true },
      order: { createdAt: 'ASC' },
    });
    const templateByCode = new Map<string, Role>();
    for (const role of templates) {
      if (!templateByCode.has(role.code)) templateByCode.set(role.code, role);
    }
    const roleCodes = [
      'SUPER_ADMIN',
      'CEO_ADMIN',
      'SALES',
      'OPERATOR',
      'ACCOUNTANT',
    ];
    const createdRoles = await this.roleRepository.save(
      roleCodes.map((roleCode) => {
        const template = templateByCode.get(roleCode);
        return this.roleRepository.create({
          organizationId: organization.id,
          code: roleCode,
          name: template?.name ?? roleCode,
          description: template?.description,
          isSystem:
            template?.isSystem ??
            ['SUPER_ADMIN', 'CEO_ADMIN'].includes(roleCode),
        });
      }),
    );
    const permissionGrants = createdRoles.flatMap((role) =>
      (templateByCode.get(role.code)?.rolePermissions ?? []).map((grant) =>
        this.rolePermissionRepository.create({
          roleId: role.id,
          permissionId: grant.permissionId,
          scope: grant.scope,
        }),
      ),
    );
    if (permissionGrants.length) {
      await this.rolePermissionRepository.save(permissionGrants);
    }

    return organization;
  }

  async getProfile(organizationId: string): Promise<Organization> {
    const org = await this.orgRepository.findOne({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException(
        `Không tìm thấy tổ chức với ID "${organizationId}"`,
      );
    }
    return org;
  }

  async updateProfile(
    organizationId: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const org = await this.getProfile(organizationId);
    Object.assign(org, updateDto);
    return this.orgRepository.save(org);
  }

  async getSettings(organizationId: string): Promise<Record<string, any>> {
    await this.getProfile(organizationId); // Verify organization exists
    return this.settingsService.getOrganizationSettings(organizationId);
  }

  async updateSetting(
    organizationId: string,
    key: string,
    value: any,
  ): Promise<any> {
    await this.getProfile(organizationId); // Verify organization exists
    return this.settingsService.updateOrganizationSetting(
      organizationId,
      key,
      value,
    );
  }
}
