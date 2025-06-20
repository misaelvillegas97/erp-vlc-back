import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                               from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags }                      from '@nestjs/swagger';
import { FleetDashboardsService }                                  from '../services/fleet-dashboards.service';
import { DashboardQueryDto }                                       from '../domain/dto/dashboards/dashboard-query.dto';
import { ActiveSessionsDashboardDto }                              from '../domain/dto/dashboards/active-sessions-dashboard.dto';
import { HistoricalAnalysisDashboardDto }                          from '../domain/dto/dashboards/historical-analysis-dashboard.dto';
import { DriverPerformanceDashboardDto }                           from '../domain/dto/dashboards/driver-performance-dashboard.dto';
import { VehicleUtilizationDashboardDto }                          from '../domain/dto/dashboards/vehicle-utilization-dashboard.dto';
import { GeographicalAnalysisDashboardDto }                        from '../domain/dto/dashboards/geographical-analysis-dashboard.dto';
import { ComplianceSafetyDashboardDto }                            from '../domain/dto/dashboards/compliance-safety-dashboard.dto';

@ApiTags('Logistics - Fleet Dashboards')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/dashboards',
  version: '1',
})
export class FleetDashboardsController {
  constructor(private readonly dashboardsService: FleetDashboardsService) {}

  @ApiOperation({summary: 'Get active sessions dashboard data'})
  @ApiResponse({
    status: 200,
    description: 'Returns active sessions dashboard data',
    type: ActiveSessionsDashboardDto
  })
  @Get('active-sessions')
  @HttpCode(HttpStatus.OK)
  getActiveSessionsDashboard(@Query() query: DashboardQueryDto): Promise<ActiveSessionsDashboardDto> {
    return this.dashboardsService.getActiveSessionsDashboard(query);
  }

  @ApiOperation({summary: 'Get historical analysis dashboard data'})
  @ApiResponse({
    status: 200,
    description: 'Returns historical analysis dashboard data',
    type: HistoricalAnalysisDashboardDto
  })
  @Get('historical-analysis')
  @HttpCode(HttpStatus.OK)
  getHistoricalAnalysisDashboard(@Query() query: DashboardQueryDto): Promise<HistoricalAnalysisDashboardDto> {
    return this.dashboardsService.getHistoricalAnalysisDashboard(query);
  }

  @ApiOperation({summary: 'Get driver performance dashboard data'})
  @ApiResponse({
    status: 200,
    description: 'Returns driver performance dashboard data',
    type: DriverPerformanceDashboardDto
  })
  @Get('driver-performance')
  @HttpCode(HttpStatus.OK)
  getDriverPerformanceDashboard(@Query() query: DashboardQueryDto): Promise<DriverPerformanceDashboardDto> {
    return this.dashboardsService.getDriverPerformanceDashboard(query);
  }

  @ApiOperation({summary: 'Get vehicle utilization dashboard data'})
  @ApiResponse({
    status: 200,
    description: 'Returns vehicle utilization dashboard data',
    type: VehicleUtilizationDashboardDto
  })
  @Get('vehicle-utilization')
  @HttpCode(HttpStatus.OK)
  getVehicleUtilizationDashboard(@Query() query: DashboardQueryDto): Promise<VehicleUtilizationDashboardDto> {
    return this.dashboardsService.getVehicleUtilizationDashboard(query);
  }

  @ApiOperation({summary: 'Get geographical analysis dashboard data'})
  @ApiResponse({
    status: 200,
    description: 'Returns geographical analysis dashboard data',
    type: GeographicalAnalysisDashboardDto
  })
  @Get('geographical-analysis')
  @HttpCode(HttpStatus.OK)
  getGeographicalAnalysisDashboard(@Query() query: DashboardQueryDto): Promise<GeographicalAnalysisDashboardDto> {
    return this.dashboardsService.getGeographicalAnalysisDashboard(query);
  }

  @ApiOperation({summary: 'Get compliance and safety dashboard data'})
  @ApiResponse({
    status: 200,
    description: 'Returns compliance and safety dashboard data',
    type: ComplianceSafetyDashboardDto
  })
  @Get('compliance-safety')
  @HttpCode(HttpStatus.OK)
  getComplianceSafetyDashboard(@Query() query: DashboardQueryDto): Promise<ComplianceSafetyDashboardDto> {
    return this.dashboardsService.getComplianceSafetyDashboard(query);
  }
}
