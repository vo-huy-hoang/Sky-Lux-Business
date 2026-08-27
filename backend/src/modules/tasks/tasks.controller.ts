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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions('task.manage')
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
  @RequirePermissions('task.manage')
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
}
