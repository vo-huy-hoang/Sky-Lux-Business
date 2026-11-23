import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, RolePermission]),
    RolesModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
