import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';

import { DossiersModule } from '../dossiers/dossiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskChecklistItem]),
    DossiersModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService, TypeOrmModule],
})
export class TasksModule {}
