import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationSetting } from './organization-setting.entity';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @OneToMany(() => OrganizationSetting, (setting) => setting.organization)
  settings: OrganizationSetting[];

  @OneToMany(() => Department, (dept) => dept.organization)
  departments: Department[];

  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}
