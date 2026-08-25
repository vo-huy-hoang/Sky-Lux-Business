import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SavedReport } from './entities/report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedReport])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService, TypeOrmModule],
})
export class ReportsModule {}
