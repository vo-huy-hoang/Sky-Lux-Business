import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiResult } from './entities/kpi-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KpiTarget, KpiResult])],
  controllers: [KpisController],
  providers: [KpisService],
  exports: [KpisService, TypeOrmModule],
})
export class KpisModule {}
