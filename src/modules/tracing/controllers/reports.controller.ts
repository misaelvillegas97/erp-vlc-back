import { Controller, Get, HttpCode, HttpStatus, Query, Res, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, }  from '@nestjs/swagger';
import { AuthGuard }                                                     from '@nestjs/passport';
import { Response }                                                      from 'express';
import { KpiService }                                                    from '../services/kpi.service';
import { KpiRequestDto }                                                 from '../domain/dto/reports/kpi-request.dto';
import { KpiResponseDto }                                                from '../domain/dto/reports/kpi-response.dto';
import { ReportExportRequestDto }                                        from '../domain/dto/reports/report-export.dto';

/**
 * Controller for handling reports and KPIs
 * Provides endpoints for metrics, bottlenecks analysis, and data export
 */
@ApiTags('Reports')
@Controller('tracing/reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly kpiService: KpiService) {}

  /**
   * Get KPI metrics for flow executions
   * @param range - Date range for the report
   * @param templateId - Optional template filter
   * @param version - Optional version filter
   * @param groupBy - Grouping period (day, week, month)
   */
  @Get('kpi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get KPI metrics',
    description: 'Retrieve key performance indicators for flow executions',
  })
  @ApiQuery({name: 'range', description: 'Date range (e.g., 2024-01-01,2024-01-31)', required: true})
  @ApiQuery({name: 'templateId', description: 'Filter by template ID', required: false})
  @ApiQuery({name: 'version', description: 'Filter by template version', required: false})
  @ApiQuery({name: 'groupBy', description: 'Group by period', enum: [ 'day', 'week', 'month' ], required: false})
  @ApiResponse({
    status: 200,
    description: 'KPI metrics retrieved successfully',
    type: KpiResponseDto,
  })
  async getKpiMetrics(
    @Query('range') range: string,
    @Query('templateId') templateId?: string,
    @Query('version') version?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ): Promise<KpiResponseDto> {
    const [ startDate, endDate ] = range.split(',');
    const kpiRequest: KpiRequestDto = {
      startDate,
      endDate,
      templateIds: templateId ? [ templateId ] : undefined,
      versions: version ? [ parseInt(version) ] : undefined,
      groupBy: groupBy || 'day',
    };

    return await this.kpiService.calculateKpis(kpiRequest);
  }

  /**
   * Get bottleneck analysis
   * @param topN - Number of top bottlenecks to return
   * @param range - Date range for analysis
   * @param templateId - Optional template filter
   */
  @Get('bottlenecks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get bottleneck analysis',
    description: 'Identify steps and processes that are causing delays',
  })
  @ApiQuery({name: 'topN', description: 'Number of top bottlenecks', required: false})
  @ApiQuery({name: 'range', description: 'Date range for analysis', required: false})
  @ApiQuery({name: 'templateId', description: 'Filter by template ID', required: false})
  @ApiResponse({
    status: 200,
    description: 'Bottleneck analysis retrieved successfully',
  })
  async getBottlenecks(
    @Query('topN') topN?: number,
    @Query('range') range?: string,
    @Query('templateId') templateId?: string,
  ): Promise<any> {
    return await this.kpiService.analyzeBottlenecks({
      topN: topN || 10,
      range,
      templateId,
    });
  }

  /**
   * Export KPI data to CSV
   * @param range - Date range for export
   * @param templateId - Optional template filter
   * @param version - Optional version filter
   * @param groupBy - Grouping period
   * @param res - Response object for file download
   */
  @Get('export/csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export KPI data to CSV',
    description: 'Download KPI metrics as CSV file',
  })
  @ApiQuery({name: 'range', description: 'Date range for export', required: true})
  @ApiQuery({name: 'templateId', description: 'Filter by template ID', required: false})
  @ApiQuery({name: 'version', description: 'Filter by template version', required: false})
  @ApiQuery({name: 'groupBy', description: 'Group by period', enum: [ 'day', 'week', 'month' ], required: false})
  @ApiResponse({
    status: 200,
    description: 'CSV file generated successfully',
  })
  async exportKpiToCsv(
    @Query('range') range: string,
    @Query('templateId') templateId?: string,
    @Query('version') version?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
    @Res() res?: Response,
  ): Promise<void> {
    const exportRequest: ReportExportRequestDto = {
      reportType: 'kpi',
      format: 'csv',
      title: `KPI Report - ${ range }`,
      includeRawData: true,
    };

    const csvData = await this.kpiService.exportKpiData(exportRequest);

    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="kpi-report-${ Date.now() }.csv"`);
      res.send(csvData);
    }
  }

  /**
   * Get execution performance metrics
   * @param range - Date range for metrics
   * @param templateId - Optional template filter
   */
  @Get('performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get execution performance metrics',
    description: 'Retrieve detailed performance metrics for flow executions',
  })
  @ApiQuery({name: 'range', description: 'Date range for metrics', required: true})
  @ApiQuery({name: 'templateId', description: 'Filter by template ID', required: false})
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(
    @Query('range') range: string,
    @Query('templateId') templateId?: string,
  ): Promise<any> {
    return await this.kpiService.getPerformanceMetrics({
      range,
      templateId,
    });
  }

  /**
   * Get waste analysis report
   * @param range - Date range for analysis
   * @param templateId - Optional template filter
   */
  @Get('waste-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get waste analysis report',
    description: 'Analyze waste patterns and trends',
  })
  @ApiQuery({name: 'range', description: 'Date range for analysis', required: true})
  @ApiQuery({name: 'templateId', description: 'Filter by template ID', required: false})
  @ApiResponse({
    status: 200,
    description: 'Waste analysis retrieved successfully',
  })
  async getWasteAnalysis(
    @Query('range') range: string,
    @Query('templateId') templateId?: string,
  ): Promise<any> {
    return await this.kpiService.analyzeWastePatterns({
      range,
      templateId,
    });
  }
}
