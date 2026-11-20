import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { SupplierType } from './entities/supplier-type.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FinancialsModule } from '../financials/financials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierType, EstimateCostLine]),
    AuditLogsModule,
    FinancialsModule,
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService, TypeOrmModule],
})
export class SuppliersModule {}
