import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskActionDto } from './dto/task-action.dto';
import { TaskExtensionRequestDto } from './dto/task-extension-request.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions('task.view')
  @ApiOperation({
    summary: 'Lấy danh sách công việc phân trang và lọc (API-TASK-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QueryTaskDto,
  ) {
    return this.tasksService.findAll(user, queryDto);
  }

  @Get(':id')
  @RequirePermissions('task.view')
  @ApiOperation({ summary: 'Lấy chi tiết công việc theo ID (API-TASK-002)' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasksService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Tạo công việc mới (API-TASK-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(user, createTaskDto);
  }

  @Patch(':id')
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Cập nhật thông tin công việc (API-TASK-004)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Xóa công việc (API-TASK-005)' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasksService.remove(user, id);
  }

  @Post(':id/start')
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Bắt đầu công việc (API-TASK-006)' })
  @ApiResponse({ status: 201, description: 'Bắt đầu thành công' })
  startTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: TaskActionDto,
  ) {
    return this.tasksService.startTask(user, id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Hoàn thành công việc (API-TASK-007)' })
  @ApiResponse({ status: 201, description: 'Hoàn thành thành công' })
  completeTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: TaskActionDto,
  ) {
    return this.tasksService.completeTask(user, id, dto);
  }

  @Post(':id/request-extension')
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Yêu cầu gia hạn công việc (API-TASK-008)' })
  @ApiResponse({ status: 201, description: 'Gia hạn thành công' })
  requestExtension(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: TaskExtensionRequestDto,
  ) {
    return this.tasksService.requestExtension(user, id, dto);
  }

  @Get(':id/checklist')
  @RequirePermissions('task.view')
  @ApiOperation({ summary: 'Lấy danh sách việc phụ (API-CHECKLIST-001)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getChecklist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.tasksService.getChecklist(user, id);
  }

  @Post(':id/checklist')
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Tạo việc phụ (API-CHECKLIST-002)' })
  @ApiResponse({ status: 201, description: 'Tạo việc phụ thành công' })
  addChecklistItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.tasksService.addChecklistItem(user, id, dto);
  }

  @Patch(':id/checklist/:itemId')
  @RequirePermissions('task.manage')
  @ApiOperation({ summary: 'Cập nhật việc phụ (API-CHECKLIST-003)' })
  @ApiResponse({ status: 200, description: 'Cập nhật việc phụ thành công' })
  updateChecklistItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.tasksService.updateChecklistItem(user, id, itemId, dto);
  }
}
