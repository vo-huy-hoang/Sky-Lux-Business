import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    private readonly settingsService: SettingsService,
  ) {}

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
