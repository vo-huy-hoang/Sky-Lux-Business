import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

import { DossiersModule } from '../dossiers/dossiers.module';
import { DossierAccessModule } from '../dossiers/dossier-access.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FinancialsModule } from '../financials/financials.module';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Estimate,
      EstimateRevenueLine,
      EstimateCostLine,
      Supplier,
    ]),
    DossiersModule,
    DossierAccessModule,
    AuditLogsModule,
    FinancialsModule,
    ApprovalsModule,
  ],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService, TypeOrmModule],
})
export class EstimatesModule {}
