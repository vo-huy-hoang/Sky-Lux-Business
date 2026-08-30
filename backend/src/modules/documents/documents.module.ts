import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentType,
      DocumentVersion,
      Dossier,
    ]),
    StorageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, TypeOrmModule],
})
export class DocumentsModule {}
