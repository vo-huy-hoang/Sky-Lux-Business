import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalRequest } from './entities/approval-request.entity';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { DossierChangeRequest } from './entities/dossier-change-request.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { DossierWorkflowService, DossierLifecycleService } from './dossier-workflow.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DossierAccessModule } from '../dossiers/dossier-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalRequest,
      WorkflowHistory,
      DossierChangeRequest,
      Dossier,
      Estimate,
    ]),
    DossierAccessModule,
    NotificationsModule,
    AuditLogsModule,
  ],
  controllers: [ApprovalsController],
  providers: [
    ApprovalsService,
    DossierWorkflowService,
    {
      provide: 'DossierLifecycleService',
      useExisting: DossierWorkflowService,
    },
  ],
  exports: [
    ApprovalsService,
    DossierWorkflowService,
    'DossierLifecycleService',
    TypeOrmModule,
  ],
})
export class ApprovalsModule {}

export { ApprovalsModule as DossierLifecycleModule };
