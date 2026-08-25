import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AccountingPeriod } from './entities/accounting-period.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingPeriod])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService, TypeOrmModule],
})
export class SettingsModule {}
