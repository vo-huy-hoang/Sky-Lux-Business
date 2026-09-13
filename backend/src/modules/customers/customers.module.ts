import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';
import { CustomerActivity } from './entities/customer-activity.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CustomerActivitiesService } from './customer-activities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerContact,
      CustomerActivity,
      Dossier,
    ]),
    AuditLogsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerActivitiesService],
  exports: [CustomersService, CustomerActivitiesService, TypeOrmModule],
})
export class CustomersModule {}
