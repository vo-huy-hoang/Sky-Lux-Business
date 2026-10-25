import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { WorkflowListQueryDto } from './dto/workflow-list-query.dto';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @RequirePermissions('approval.view')
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query() query: WorkflowListQueryDto,
  ) {
    return this.approvalsService.findAll(organizationId, userId, query);
  }

  @Get(':id')
  @RequirePermissions('approval.view')
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.approvalsService.findOne(organizationId, userId, id);
  }
}
