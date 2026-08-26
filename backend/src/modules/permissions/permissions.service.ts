import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { QueryPermissionDto } from './dto/query-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(query: QueryPermissionDto) {
    const { page = 1, limit = 100, search, module: moduleFilter } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.permissionRepository
      .createQueryBuilder('permission')
      .orderBy('permission.module', 'ASC')
      .addOrderBy('permission.code', 'ASC');

    if (moduleFilter && moduleFilter.trim()) {
      queryBuilder.andWhere('permission.module = :moduleFilter', {
        moduleFilter: moduleFilter.trim().toUpperCase(),
      });
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(permission.code ILIKE :keyword OR permission.name ILIKE :keyword OR permission.description ILIKE :keyword)',
        { keyword },
      );
    }

    const [permissions, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const items = permissions.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      module: p.module,
      description: p.description,
      createdAt: p.createdAt,
    }));

    // Group permissions by module for easier UI matrix rendering
    const modules: Record<string, typeof items> = {};
    items.forEach((p) => {
      const mod = p.module || 'OTHER';
      if (!modules[mod]) modules[mod] = [];
      modules[mod].push(p);
    });

    return {
      items,
      modules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
