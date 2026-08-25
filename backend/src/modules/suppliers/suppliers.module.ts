import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { SupplierType } from './entities/supplier-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierType])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService, TypeOrmModule],
})
export class SuppliersModule {}
