import { PartialType } from '@nestjs/swagger';
import { CreateKpiTargetDto } from './create-kpi-target.dto';

export class UpdateKpiTargetDto extends PartialType(CreateKpiTargetDto) {}
