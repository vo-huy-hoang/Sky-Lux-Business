import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { SavedReport } from './entities/report.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SavedReport)
    private readonly reportRepository: Repository<SavedReport>,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    createReportDto: CreateReportDto,
  ) {
    const report = this.reportRepository.create({
      ...createReportDto,
      organizationId,
      createdBy: userId,
      filters: createReportDto.filters || {},
      name: createReportDto.name.trim(),
      reportType: createReportDto.reportType.trim().toUpperCase(),
    });
    return { data: await this.reportRepository.save(report) };
  }

  async findAll(
    organizationId: string,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || query.limit || 20, 100);
    const qb = this.reportRepository
      .createQueryBuilder('report')
      .where('report.organizationId = :organizationId', { organizationId });
    if (query.search?.trim()) {
      qb.andWhere(
        '(report.name ILIKE :search OR report.reportType ILIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    qb.orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo đã lưu');
    return { data: report };
  }

  async update(
    organizationId: string,
    id: string,
    updateReportDto: UpdateReportDto,
  ) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo đã lưu');
    Object.assign(report, updateReportDto);
    if (updateReportDto.name) report.name = updateReportDto.name.trim();
    if (updateReportDto.reportType)
      report.reportType = updateReportDto.reportType.trim().toUpperCase();
    return { data: await this.reportRepository.save(report) };
  }

  async remove(organizationId: string, id: string) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo đã lưu');
    await this.reportRepository.softRemove(report);
    return { data: { deleted: true } };
  }
}
