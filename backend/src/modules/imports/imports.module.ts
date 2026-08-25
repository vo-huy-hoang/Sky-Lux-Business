import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportTemplate } from './entities/import-template.entity';
import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportTemplate,
      ImportSession,
      ImportRow,
      ImportError,
    ]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService, TypeOrmModule],
})
export class ImportsModule {}
