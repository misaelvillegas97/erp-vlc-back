import { Controller, Get, Inject }                                                                             from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ApiTags }                                                                                             from '@nestjs/swagger';
import { ConfigService }                                                                                       from '@nestjs/config';
import { REQUEST }                                                                                             from '@nestjs/core';
import { AllConfigType }                                                                                       from '@core/config/config.type';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(REQUEST) private readonly request: any,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const port = this.configService.get<AllConfigType>('app.port', {infer: true}) || 5000;

    return this.health.check([
      // Basic ping check to ensure the API is responding
      () => this.http.pingCheck('api', `http://localhost:${ port }`),

      // Database connection check
      () => this.db.pingCheck('database'),

      // Memory heap check
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB

    ]);
  }

  @Get('ping')
  @HealthCheck()
  ping() {
    return this.health.check([
      () => this.http.pingCheck('api', 'http://localhost/api'),
    ]);
  }
}
