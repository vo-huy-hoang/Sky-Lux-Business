import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Organization[]> {
    return this.orgRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const code = dto.code.trim().toUpperCase();
    const slug = dto.slug.trim().toLowerCase();
    const taxCode = dto.taxCode?.trim();
    const contactEmail = dto.contactEmail?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    return this.dataSource.transaction(async (manager) => {
      const orgRepo = manager.getRepository(Organization);
      const roleRepo = manager.getRepository(Role);
      const rolePermRepo = manager.getRepository(RolePermission);

      const duplicate = await orgRepo.findOne({
        where: [{ code }, { slug }],
      });
      if (duplicate) {
        if (duplicate.code?.toUpperCase() === code) {
          throw new ConflictException(
            `Mã doanh nghiệp "${code}" đã tồn tại trong hệ thống`,
          );
        }
        if (duplicate.slug?.toLowerCase() === slug) {
          throw new ConflictException(
            `Tenant key "${slug}" đã tồn tại trong hệ thống`,
          );
        }
        throw new ConflictException('Mã doanh nghiệp hoặc tenant key đã tồn tại');
      }

      if (taxCode) {
        const duplicateTaxCode = await orgRepo.findOne({
          where: { taxCode },
        });
        if (duplicateTaxCode) {
          throw new ConflictException(
            `Mã số thuế "${taxCode}" đã tồn tại trong hệ thống`,
          );
        }
      }

      if (contactEmail) {
        const duplicateContactEmail = await orgRepo.findOne({
          where: { contactEmail: ILike(contactEmail) },
        });
        if (duplicateContactEmail) {
          throw new ConflictException(
            `Email liên hệ "${contactEmail}" đã tồn tại trong hệ thống`,
          );
        }
      }

      if (phone) {
        const duplicatePhone = await orgRepo.findOne({
          where: { phone },
        });
        if (duplicatePhone) {
          throw new ConflictException(
            `Số điện thoại "${phone}" đã tồn tại trong hệ thống`,
          );
        }
      }

      const organization = await orgRepo.save(
        orgRepo.create({
          ...dto,
          code,
          slug,
          taxCode: taxCode || undefined,
          contactEmail: contactEmail || undefined,
          phone: phone || undefined,
          name: dto.name.trim(),
          timezone: dto.timezone ?? 'Asia/Ho_Chi_Minh',
          currency: dto.currency?.trim().toUpperCase() ?? 'VND',
          status: 'ACTIVE',
        }),
      );

      // Every organization needs its own role records and permission grants.
      // Copy the role template from the first configured organization.
      const templates = await roleRepo.find({
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
      const createdRoles = await roleRepo.save(
        roleCodes.map((roleCode) => {
          const template = templateByCode.get(roleCode);
          return roleRepo.create({
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
          rolePermRepo.create({
            roleId: role.id,
            permissionId: grant.permissionId,
            scope: grant.scope,
          }),
        ),
      );
      if (permissionGrants.length) {
        await rolePermRepo.save(permissionGrants);
      }

      return organization;
    });
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

  async updateOrganization(
    id: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.orgRepository.findOne({ where: { id } });
    if (!organization) {
      throw new NotFoundException(`Không tìm thấy doanh nghiệp với ID "${id}"`);
    }
    Object.assign(organization, updateDto);
    return this.orgRepository.save(organization);
  }

  async removeOrganization(id: string) {
    const result = await this.orgRepository.softDelete(id);
    if (!result.affected) {
      throw new NotFoundException(`Không tìm thấy doanh nghiệp với ID "${id}"`);
    }
    return { deleted: true, id };
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
