import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportTemplate } from './entities/import-template.entity';
import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ImportProcessor } from './queue/import.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportTemplate,
      ImportSession,
      ImportRow,
      ImportError,
      Dossier,
      Customer,
    ]),
    BullModule.registerQueue({
      name: 'import-queue',
    }),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessor],
  exports: [ImportsService, TypeOrmModule],
})
export class ImportsModule {}
