import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { AccountingPeriod } from './entities/accounting-period.entity';
import { OrganizationSetting } from '../organizations/entities/organization-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingPeriod, OrganizationSetting])],
  controllers: [],
  providers: [SettingsService],
  exports: [SettingsService, TypeOrmModule],
})
export class SettingsModule {}
