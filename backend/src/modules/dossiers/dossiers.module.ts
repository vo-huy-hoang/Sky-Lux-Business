import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DossiersService } from './dossiers.service';
import { DossiersController } from './dossiers.controller';
import { Dossier } from './entities/dossier.entity';
import { DossierPassenger } from './entities/dossier-passenger.entity';
import { Payment } from './entities/payment.entity';
import { Comment } from './entities/comment.entity';
import { ApprovalsModule } from '../approvals/approvals.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dossier, DossierPassenger, Payment, Comment]),
    ApprovalsModule,
    DocumentsModule,
    NotificationsModule,
  ],
  controllers: [DossiersController],
  providers: [DossiersService],
  exports: [DossiersService, TypeOrmModule],
})
export class DossiersModule {}
