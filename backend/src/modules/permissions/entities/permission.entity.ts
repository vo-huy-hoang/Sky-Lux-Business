import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  module?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions: RolePermission[];
}
