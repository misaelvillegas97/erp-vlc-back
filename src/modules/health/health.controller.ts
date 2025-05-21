import { Controller, Get }                                                              from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse }                                           from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Perform a full health check (API and Database)' })
  @ApiResponse({ status: 200, description: 'Health check successful. Returns health status for API and Database.', example: { status: 'ok', info: { api: { status: 'up' }, database: { status: 'up' } }, error: {}, details: { api: { status: 'up' }, database: { status: 'up' } } } })
  @ApiResponse({ status: 503, description: 'Health check failed. One or more components are down.', example: { status: 'error', info: {}, error: { database: { status: 'down' } }, details: { database: { status: 'down' } } } })
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
  @ApiOperation({ summary: 'Perform a basic API ping check' })
  @ApiResponse({ status: 200, description: 'API is responsive. Returns health status for API.', example: { status: 'ok', info: { api: { status: 'up' } }, error: {}, details: { api: { status: 'up' } } } })
  @ApiResponse({ status: 503, description: 'API is not responsive.', example: { status: 'error', info: {}, error: { api: { status: 'down' } }, details: { api: { status: 'down' } } } })
  ping() {
    const port = this.configService.get<AllConfigType>('app.port', {infer: true}) || 5000;

    return this.health.check([
      () => this.http.pingCheck('api', `http://localhost:${ port }`),
    ]);
  }
}
