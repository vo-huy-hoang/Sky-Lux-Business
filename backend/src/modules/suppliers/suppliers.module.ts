import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { SupplierType } from './entities/supplier-type.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierType, EstimateCostLine]),
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService, TypeOrmModule],
})
export class SuppliersModule {}
