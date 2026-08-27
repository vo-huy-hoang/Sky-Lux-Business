import {
  Put,
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user.manage')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.findAll(organizationId);
  }

  @Get(':id')
  @RequirePermissions('user.manage')
  @ApiParam({ name: 'id', description: 'User UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  @ApiParam({ name: 'id', description: 'User UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('user.manage')
  @ApiParam({ name: 'id', description: 'User UUID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/lock')
  @Roles('SUPER_ADMIN', 'CEO_ADMIN')
  @ApiOperation({
    summary:
      'Khóa tài khoản người dùng và thu hồi mọi phiên đăng nhập (API-USERS-005)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  lock(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.lockUser(id);
  }

  @Put(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Gán vai trò cho nhân viên (API-RBAC-006)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Gán vai trò thành công' })
  @ApiResponse({
    status: 400,
    description: 'Yêu cầu không hợp lệ hoặc vai trò sai tổ chức',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignRolesDto: AssignRolesDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.usersService.assignRoles(id, assignRolesDto, organizationId);
  }
}
