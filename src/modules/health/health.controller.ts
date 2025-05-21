import { Controller, Get }                                                              from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ApiTags }                                                                      from '@nestjs/swagger';
import { ConfigService }                                                                from '@nestjs/config';
import { AllConfigType }                                                                from '@core/config/config.type';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
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
    ]);
  }

  @Get('ping')
  @HealthCheck()
  ping() {
    const port = this.configService.get<AllConfigType>('app.port', {infer: true}) || 5000;

    return this.health.check([
      () => this.http.pingCheck('api', `http://localhost:${ port }`),
    ]);
  }
}
