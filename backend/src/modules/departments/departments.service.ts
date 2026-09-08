import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(
    organizationId: string,
    createDepartmentDto: CreateDepartmentDto,
  ) {
    const code = createDepartmentDto.code.trim().toUpperCase();
    const existing = await this.departmentRepository.findOne({
      where: { organizationId, code },
    });
    if (existing) {
      throw new ConflictException(`Mã phòng ban "${code}" đã tồn tại`);
    }

    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      organizationId,
      code,
      name: createDepartmentDto.name.trim(),
      status: createDepartmentDto.status || 'ACTIVE',
    });
    return { data: await this.departmentRepository.save(department) };
  }

  async findAll(
    organizationId: string,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || query.limit || 20, 100);
    const qb = this.departmentRepository
      .createQueryBuilder('department')
      .where('department.organizationId = :organizationId', { organizationId });
    if (query.search?.trim()) {
      qb.andWhere(
        '(department.code ILIKE :search OR department.name ILIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    qb.orderBy('department.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const department = await this.departmentRepository.findOne({
      where: { id, organizationId },
      relations: { users: true },
    });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban');
    return { data: department };
  }

  async update(
    organizationId: string,
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
    const department = await this.departmentRepository.findOne({
      where: { id, organizationId },
    });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban');
    if (updateDepartmentDto.code) {
      const code = updateDepartmentDto.code.trim().toUpperCase();
      const duplicate = await this.departmentRepository.findOne({
        where: { organizationId, code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Mã phòng ban "${code}" đã tồn tại`);
      }
      updateDepartmentDto.code = code;
    }
    Object.assign(department, updateDepartmentDto);
    if (department.name) department.name = department.name.trim();
    return { data: await this.departmentRepository.save(department) };
  }

  async remove(organizationId: string, id: string) {
    const department = await this.departmentRepository.findOne({
      where: { id, organizationId },
    });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban');
    await this.departmentRepository.softRemove(department);
    return { data: { deleted: true } };
  }
}
