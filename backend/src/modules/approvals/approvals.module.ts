import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalRequest } from './entities/approval-request.entity';
import { WorkflowHistory } from './entities/workflow-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApprovalRequest, WorkflowHistory])],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService, TypeOrmModule],
})
export class ApprovalsModule {}
