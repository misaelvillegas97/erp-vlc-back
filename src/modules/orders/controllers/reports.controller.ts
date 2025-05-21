import { Controller, Get, Logger, Query, Res, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response }                                        from 'express';
import { ReportsService }                                  from '../services/reports.service';
import { AuthGuard }                                       from '@nestjs/passport';
import { Roles }                                           from '@modules/roles/roles.decorator';
import { RoleEnum }                                        from '@modules/roles/roles.enum';
import { DateTime }                                        from 'luxon';

@ApiTags('Orders - Reports')
@ApiBearerAuth()
@Controller('orders/reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  private readonly logger = new Logger('ReportsController');

  constructor(private readonly reportsService: ReportsService) {}

  @Get('delivery')
  @Roles(RoleEnum.admin, RoleEnum.dispatcher)
  @ApiOperation({ summary: 'Get delivery report' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'driverId', required: false, type: String, description: 'Driver ID' })
  @ApiResponse({ status: 200, description: 'Delivery report retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async getDeliveryReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('driverId') driverId?: string,
  ) {
    this.logger.log(`GET /api/logistics/reports/delivery - From ${ startDate } to ${ endDate }`);
    return this.reportsService.generateDeliveryReport(startDate, endDate, driverId);
  }

  @Get('delivery/export')
  @Roles(RoleEnum.admin, RoleEnum.dispatcher)
  @ApiOperation({ summary: 'Export delivery report to Excel' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'driverId', required: true, type: String, description: 'Driver ID' })
  @ApiResponse({ status: 200, description: 'Delivery report exported successfully. Returns an Excel file.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async exportDeliveryReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('driverId') driverId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`GET /api/logistics/reports/delivery/export - From ${ startDate } to ${ endDate }`);

    const reportData = await this.reportsService.generateDeliveryReport(
      startDate,
      endDate,
      driverId,
    );

    const buffer = await this.reportsService.exportReportToExcel(reportData);

    const dateStr = DateTime.now().toISODate();
    const fileName = `reporte_entregas_${ dateStr }.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ fileName }"`,
      'Content-Length': buffer.byteLength,
    });

    res.end(buffer);
  }
}
