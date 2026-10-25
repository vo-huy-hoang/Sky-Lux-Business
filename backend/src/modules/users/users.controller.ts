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
  Query,
  ParseUUIDPipe,
  ForbiddenException,
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
import { QueryUserDto } from './dto/query-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCeoUserDto } from './dto/create-ceo-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.view')
  @ApiOperation({
    summary: 'Lấy danh sách người dùng phân trang và lọc (API-USERS-001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách người dùng thành công',
  })
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() queryDto: QueryUserDto,
  ) {
    return this.usersService.findAll(organizationId, queryDto);
  }

  @Get(':id')
  @RequirePermissions('user.view')
  @ApiOperation({
    summary: 'Lấy chi tiết người dùng theo ID (API-USERS-002)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin chi tiết người dùng thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.usersService.findOne(organizationId, id, actorUserId)
      : this.usersService.findOne(organizationId, id);
  }

  @Post()
  @RequirePermissions('user.manage')
  @Roles('CEO_ADMIN')
  @ApiOperation({ summary: 'Tạo người dùng mới (API-USERS-003)' })
  @ApiResponse({ status: 201, description: 'Tạo người dùng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc sai phòng ban/vai trò',
  })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc mã nhân viên đã tồn tại',
  })
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('id') actorUserId?: string,
    @CurrentUser('roles') actorRoles: string[] = [],
  ) {
    if (
      !actorRoles.includes('CEO_ADMIN') ||
      actorRoles.includes('SUPER_ADMIN')
    ) {
      throw new ForbiddenException(
        'Chỉ CEO_ADMIN được tạo tài khoản OPERATOR hoặc SALES tại tổ chức của mình',
      );
    }
    return this.usersService.create(
      organizationId,
      createUserDto,
      actorUserId,
      actorRoles,
    );
  }

  @Post('ceo')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'SUPER_ADMIN tạo CEO_ADMIN cho tổ chức đã có' })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản CEO_ADMIN thành công',
  })
  createCeo(
    @Body() dto: CreateCeoUserDto,
    @CurrentUser('id') actorUserId: string,
    @CurrentUser('roles') actorRoles: string[] = [],
  ) {
    if (!actorRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Chỉ SUPER_ADMIN được tạo tài khoản CEO_ADMIN',
      );
    }
    return this.usersService.createCeo(dto, actorUserId, actorRoles);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Cập nhật thông tin người dùng (API-USERS-004)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật người dùng thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc sai phòng ban/vai trò',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc mã nhân viên bị trùng lặp',
  })
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') actorUserId?: string,
    @CurrentUser('roles') actorRoles?: string[],
  ) {
    return actorUserId
      ? this.usersService.update(
          organizationId,
          id,
          updateUserDto,
          actorUserId,
          actorRoles,
        )
      : this.usersService.update(organizationId, id, updateUserDto);
  }

  @Post(':id/lock')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary:
      'Khóa tài khoản người dùng và thu hồi mọi phiên đăng nhập (API-USERS-005)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Khóa tài khoản người dùng thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  lock(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.usersService.lockUser(organizationId, id, actorUserId)
      : this.usersService.lockUser(organizationId, id);
  }

  @Post(':id/unlock')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Mở khóa tài khoản người dùng (API-USERS-006)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Mở khóa tài khoản người dùng thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  unlock(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.usersService.unlockUser(organizationId, id, actorUserId)
      : this.usersService.unlockUser(organizationId, id);
  }

  @Delete(':id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Xóa người dùng (API-USERS-007)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Xóa người dùng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId?: string,
  ) {
    return actorUserId
      ? this.usersService.remove(organizationId, id, actorUserId)
      : this.usersService.remove(organizationId, id);
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
    @CurrentUser('id') actorUserId?: string,
    @CurrentUser('roles') actorRoles?: string[],
  ) {
    return actorUserId
      ? this.usersService.assignRoles(
          id,
          assignRolesDto,
          organizationId,
          actorUserId,
          actorRoles,
        )
      : this.usersService.assignRoles(
          id,
          assignRolesDto,
          organizationId,
          undefined,
          actorRoles,
        );
  }
}
