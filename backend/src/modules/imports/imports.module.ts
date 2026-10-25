import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportTemplate } from './entities/import-template.entity';
import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { BusinessLine } from '../master-data/entities/business-line.entity';
import { MarketType } from '../master-data/entities/market-type.entity';
import { PassengerType } from '../master-data/entities/passenger-type.entity';
import { ServiceCategory } from '../master-data/entities/service-category.entity';
import { Unit } from '../master-data/entities/unit.entity';
import { ImportProcessor } from './queue/import.processor';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportTemplate,
      ImportSession,
      ImportRow,
      ImportError,
      Dossier,
      Customer,
      Estimate,
      EstimateRevenueLine,
      EstimateCostLine,
      BusinessLine,
      MarketType,
      PassengerType,
      ServiceCategory,
      Unit,
    ]),
    BullModule.registerQueue({
      name: 'import-queue',
    }),
    AuditLogsModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessor],
  exports: [ImportsService, TypeOrmModule],
})
export class ImportsModule {}
