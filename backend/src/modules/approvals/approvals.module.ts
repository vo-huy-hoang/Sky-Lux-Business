import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalRequest } from './entities/approval-request.entity';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { DossierWorkflowService } from './dossier-workflow.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalRequest,
      WorkflowHistory,
      Dossier,
      Estimate,
    ]),
    NotificationsModule,
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, DossierWorkflowService],
  exports: [ApprovalsService, DossierWorkflowService, TypeOrmModule],
})
export class ApprovalsModule {}
