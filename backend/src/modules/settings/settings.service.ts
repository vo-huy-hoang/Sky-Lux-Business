import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationSetting } from './entities/organization-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(OrganizationSetting)
    private readonly settingRepository: Repository<OrganizationSetting>,
  ) {}

  async getOrganizationSettings(organizationId: string): Promise<Record<string, any>> {
    const settings = await this.settingRepository.find({
      where: { organizationId },
    });

    const config: Record<string, any> = {};
    for (const setting of settings) {
      config[setting.key] = setting.value;
    }
    return config;
  }

  async getOrganizationSetting(organizationId: string, key: string): Promise<any> {
    const setting = await this.settingRepository.findOne({
      where: { organizationId, key },
    });
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    return setting.value;
  }

  async updateOrganizationSetting(
    organizationId: string,
    key: string,
    value: any,
  ): Promise<OrganizationSetting> {
    let setting = await this.settingRepository.findOne({
      where: { organizationId, key },
    });

    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingRepository.create({
        organizationId,
        key,
        value,
      });
    }

    return this.settingRepository.save(setting);
  }
}
