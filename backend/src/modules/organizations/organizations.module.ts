import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization } from './entities/organization.entity';
import { OrganizationSetting } from './entities/organization-setting.entity';
import { SettingsModule } from '../settings/settings.module';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationSetting,
      Role,
      RolePermission,
    ]),
    SettingsModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService, TypeOrmModule],
})
export class OrganizationsModule {}
