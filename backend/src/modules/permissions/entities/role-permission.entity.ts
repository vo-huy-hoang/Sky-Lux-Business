import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from './permission.entity';
import { RoleScope } from '../../../common/enums';

@Entity('role_permissions')
@Unique(['roleId', 'permissionId'])
export class RolePermission extends BaseEntity {
  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId: string;

  @Column({
    type: 'enum',
    enum: RoleScope,
    default: RoleScope.ALL,
  })
  scope: RoleScope;

  @ManyToOne(() => Role, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, (perm) => perm.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
