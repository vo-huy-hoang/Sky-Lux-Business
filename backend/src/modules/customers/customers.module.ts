import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerContact])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, TypeOrmModule],
})
export class CustomersModule {}
