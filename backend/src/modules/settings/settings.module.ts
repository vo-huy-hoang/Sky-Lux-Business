import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AccountingPeriod } from './entities/accounting-period.entity';
import { OrganizationSetting } from './entities/organization-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingPeriod, OrganizationSetting])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService, TypeOrmModule],
})
export class SettingsModule {}
