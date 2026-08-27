import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';

import { DossiersModule } from '../dossiers/dossiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estimate, EstimateRevenueLine, EstimateCostLine]),
    DossiersModule,
  ],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService, TypeOrmModule],
})
export class EstimatesModule {}
