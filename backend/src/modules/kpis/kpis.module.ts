import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiResult } from './entities/kpi-result.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiTarget,
      KpiResult,
      Dossier,
      Estimate,
      EstimateRevenueLine,
      EstimateCostLine,
    ]),
  ],
  controllers: [KpisController],
  providers: [KpisService],
  exports: [KpisService, TypeOrmModule],
})
export class KpisModule {}
