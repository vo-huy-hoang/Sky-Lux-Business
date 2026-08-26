import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from '../roles/dto/assign-user-roles.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('user.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Put(':id/roles')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Gán danh sách vai trò cho người dùng (API-RBAC-006)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Gán vai trò thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  assignUserRoles(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignUserRolesDto: AssignUserRolesDto,
  ) {
    return this.rolesService.assignUserRoles(
      organizationId,
      id,
      assignUserRolesDto.roleIds,
      actorUserId,
    );
  }

  @Post(':id/lock')
  @Roles('SUPER_ADMIN', 'CEO_ADMIN')
  @ApiOperation({ summary: 'Khóa tài khoản người dùng (API-USERS-005)' })
  lock(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.lockUser(id);
  }
}
