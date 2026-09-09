import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Kiểm tra sức khỏe hệ thống (API-HEALTH-001)' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động tốt' })
  @ApiResponse({ status: 503, description: 'Hệ thống đang gặp sự cố' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      // Giới hạn Heap Memory 300MB để đảm bảo an toàn vận hành
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
