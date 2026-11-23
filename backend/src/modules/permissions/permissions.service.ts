import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class PermissionsService {
  constructor(
    @Optional()
    private readonly rolesService?: RolesService,
    @Optional()
    @InjectRepository(Permission)
    private readonly permissionRepository?: Repository<Permission>,
  ) {}

  async findAll(): Promise<Permission[]> {
    if (this.rolesService) {
      return this.rolesService.findAllPermissions();
    }
    if (this.permissionRepository) {
      return this.permissionRepository.find({
        order: { module: 'ASC', code: 'ASC' },
      });
    }
    return [];
  }
}
