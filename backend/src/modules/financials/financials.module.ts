import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { FinancialReadModelService } from './financial-read-model.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Estimate,
      EstimateRevenueLine,
      EstimateCostLine,
    ]),
  ],
  providers: [FinancialReadModelService],
  exports: [FinancialReadModelService],
})
export class FinancialsModule {}
