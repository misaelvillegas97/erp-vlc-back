import { Injectable }                              from '@nestjs/common';
import { InjectRepository }                        from '@nestjs/typeorm';
import { Between, Repository }                     from 'typeorm';
import { FlowInstanceEntity }                      from '../domain/entities/flow-instance.entity';
import { StepExecutionEntity }                     from '../domain/entities/step-execution.entity';
import { WasteRecordEntity }                       from '../domain/entities/waste-record.entity';
import { FlowInstanceStatus, StepExecutionStatus } from '../domain/enums/execution-status.enum';
import { KpiRequestDto }                           from '../domain/dto/reports/kpi-request.dto';
import { KpiResponseDto }                          from '../domain/dto/reports/kpi-response.dto';
import { ReportExportRequestDto }                  from '../domain/dto/reports/report-export.dto';

/**
 * Service for calculating KPIs and generating reports
 * Handles metrics calculation, bottleneck analysis, and data export
 */
@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(FlowInstanceEntity)
    private readonly flowInstanceRepository: Repository<FlowInstanceEntity>,
    @InjectRepository(StepExecutionEntity)
    private readonly stepExecutionRepository: Repository<StepExecutionEntity>,
    @InjectRepository(WasteRecordEntity)
    private readonly wasteRecordRepository: Repository<WasteRecordEntity>,
  ) {}

  /**
   * Calculate KPI metrics based on request parameters
   * @param request - KPI request parameters
   * @returns KPI response with calculated metrics
   */
  async calculateKpis(request: KpiRequestDto): Promise<KpiResponseDto> {
    const {startDate: startDateStr, endDate: endDateStr, templateIds, versions, groupBy} = request;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Build base query conditions
    const whereConditions: any = {
      createdAt: Between(startDate, endDate),
    };

    if (templateIds && templateIds.length > 0) {
      whereConditions.templateId = templateIds.length === 1 ? templateIds[0] : templateIds;
    }

    if (versions && versions.length > 0) {
      whereConditions.version = versions.length === 1 ? versions[0] : versions;
    }

    // Get flow instances data
    const flowInstances = await this.flowInstanceRepository.find({
      where: whereConditions,
      relations: [ 'stepExecutions', 'wasteRecords' ],
    });

    // Calculate basic metrics
    const totalInstances = flowInstances.length;
    const completedInstances = flowInstances.filter(
      instance => instance.status === FlowInstanceStatus.FINISHED
    ).length;
    const cancelledInstances = flowInstances.filter(
      instance => instance.status === FlowInstanceStatus.CANCELLED
    ).length;
    const inProgressInstances = flowInstances.filter(
      instance => instance.status === FlowInstanceStatus.ACTIVE
    ).length;

    // Calculate completion rate
    const completionRate = totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0;

    // Calculate average execution time
    const completedWithTimes = flowInstances.filter(
      instance => instance.status === FlowInstanceStatus.FINISHED && instance.finishedAt
    );
    const avgExecutionTime = this.calculateAverageExecutionTime(completedWithTimes);

    // Calculate step metrics
    const stepMetrics = await this.calculateStepMetrics(whereConditions);

    // Calculate waste metrics
    const wasteMetrics = await this.calculateWasteMetrics(whereConditions);

    // Group data by period if requested
    const timeSeriesData = this.groupDataByPeriod(flowInstances, groupBy);

    // Calculate total execution time
    const totalExecutionTime = completedWithTimes.reduce((sum, instance) => {
      if (instance.startedAt && instance.finishedAt) {
        return sum + this.calculateDuration(instance.startedAt, instance.finishedAt);
      }
      return sum;
    }, 0);

    return {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      groupBy,
      summary: {
        totalInstances,
        totalExecutionTime: Math.round(totalExecutionTime),
        averageInstanceTime: Math.round(avgExecutionTime * 60), // Convert to seconds
        dataPoints: timeSeriesData.length,
      },
      metrics: [
        {
          name: 'instances_processed',
          label: 'Total flow instances processed',
          value: totalInstances,
          unit: 'count',
        },
        {
          name: 'completion_rate',
          label: 'Percentage of instances completed successfully',
          value: Math.round(completionRate * 100) / 100,
          unit: 'percentage',
        },
        {
          name: 'avg_execution_time',
          label: 'Average execution time per instance',
          value: Math.round(avgExecutionTime),
          unit: 'minutes',
        },
      ],
      stepMetrics: stepMetrics ? [ stepMetrics ] : undefined,
      wasteAnalysis: wasteMetrics,
      timeSeries: timeSeriesData.length > 0 ? {instances: timeSeriesData} : undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze bottlenecks in flow execution
   * @param params - Analysis parameters
   * @returns Bottleneck analysis results
   */
  async analyzeBottlenecks(params: {
    topN: number;
    range?: string;
    templateId?: string;
  }): Promise<any> {
    const {topN, range, templateId} = params;

    const whereConditions: any = {};
    if (range) {
      const [ startStr, endStr ] = range.split(',');
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      whereConditions.createdAt = Between(startDate, endDate);
    }

    if (templateId) {
      whereConditions.templateId = templateId;
    }

    // Get step executions with duration data
    const stepExecutions = await this.stepExecutionRepository
      .createQueryBuilder('step')
      .leftJoinAndSelect('step.flowInstance', 'instance')
      .leftJoinAndSelect('step.flowStep', 'flowStep')
      .where(whereConditions)
      .andWhere('step.status = :status', {status: StepExecutionStatus.DONE})
      .andWhere('step.startedAt IS NOT NULL')
      .andWhere('step.finishedAt IS NOT NULL')
      .getMany();

    // Calculate duration for each step execution
    const stepDurations = stepExecutions.map(step => ({
      stepId: step.stepId,
      stepName: step.step?.name || 'Unknown Step',
      templateId: step.instance?.templateId,
      duration: this.calculateDuration(step.startedAt, step.finishedAt),
      instanceId: step.instanceId,
    }));

    // Group by step and calculate statistics
    const stepStats = this.groupStepStatistics(stepDurations);

    // Sort by average duration and get top N
    const bottlenecks = Object.values(stepStats)
      .sort((a: any, b: any) => b.avgDuration - a.avgDuration)
      .slice(0, topN);

    return {
      topBottlenecks: bottlenecks,
      analysisDate: new Date().toISOString(),
      totalStepsAnalyzed: Object.keys(stepStats).length,
      totalExecutionsAnalyzed: stepDurations.length,
    };
  }

  /**
   * Export KPI data to CSV format
   * @param request - Export request parameters
   * @returns CSV data as string
   */
  async exportKpiData(request: ReportExportRequestDto): Promise<string> {
    // For now, create a basic KPI request - this could be enhanced to extract dates from the request
    const kpiRequest: KpiRequestDto = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      endDate: new Date().toISOString(),
      groupBy: 'day',
    };

    const kpiData = await this.calculateKpis(kpiRequest);

    // Use request title if provided
    const reportTitle = request.title || 'KPI Report';

    // Generate CSV headers
    const headers = [
      'Date',
      'Total Instances',
      'Completed',
      'Cancelled',
      'In Progress',
      'Completion Rate %',
      'Avg Execution Time (min)',
      'Total Waste Items',
      'Total Waste Value',
    ];

    // Generate CSV rows
    const timeSeriesArray = kpiData.timeSeries?.instances || [];
    const rows = timeSeriesArray.map((data: any) => [
      data.timestamp || data.date,
      data.totalInstances || data.value,
      data.completedInstances || 0,
      data.cancelledInstances || 0,
      data.inProgressInstances || 0,
      data.completionRate || 0,
      data.avgExecutionTime || 0,
      data.wasteItems || 0,
      data.wasteValue || 0,
    ]);

    // Combine headers and rows
    const csvContent = [ headers, ...rows ]
      .map(row => row.map(cell => `"${ cell }"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get detailed performance metrics
   * @param params - Performance metrics parameters
   * @returns Performance metrics data
   */
  async getPerformanceMetrics(params: {
    range: string;
    templateId?: string;
  }): Promise<any> {
    const {range, templateId} = params;
    const [ startStr, endStr ] = range.split(',');
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const whereConditions: any = {
      createdAt: Between(startDate, endDate),
    };

    if (templateId) {
      whereConditions.templateId = templateId;
    }

    // Get performance data
    const instances = await this.flowInstanceRepository.find({
      where: whereConditions,
      relations: [ 'stepExecutions' ],
    });

    // Calculate performance metrics
    const performanceData = {
      throughput: this.calculateThroughput(instances, startDate, endDate),
      cycleTime: this.calculateCycleTime(instances),
      leadTime: this.calculateLeadTime(instances),
      efficiency: this.calculateEfficiency(instances),
      qualityMetrics: await this.calculateQualityMetrics(whereConditions),
    };

    return performanceData;
  }

  /**
   * Analyze waste patterns and trends
   * @param params - Waste analysis parameters
   * @returns Waste analysis results
   */
  async analyzeWastePatterns(params: {
    range: string;
    templateId?: string;
  }): Promise<any> {
    const {range, templateId} = params;
    const [ startStr, endStr ] = range.split(',');
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const whereConditions: any = {
      createdAt: Between(startDate, endDate),
    };

    if (templateId) {
      // Join with flow instance to filter by template
      const wasteRecords = await this.wasteRecordRepository
        .createQueryBuilder('waste')
        .leftJoinAndSelect('waste.stepExecution', 'step')
        .leftJoinAndSelect('step.flowInstance', 'instance')
        .where('waste.createdAt BETWEEN :startDate AND :endDate', {startDate, endDate})
        .andWhere('instance.templateId = :templateId', {templateId})
        .getMany();

      return this.processWasteAnalysis(wasteRecords);
    } else {
      const wasteRecords = await this.wasteRecordRepository.find({
        where: whereConditions,
        relations: [ 'stepExecution', 'stepExecution.flowInstance' ],
      });

      return this.processWasteAnalysis(wasteRecords);
    }
  }

  // Private helper methods


  private calculateAverageExecutionTime(instances: FlowInstanceEntity[]): number {
    if (instances.length === 0) return 0;

    const totalTime = instances.reduce((sum, instance) => {
      if (instance.startedAt && instance.finishedAt) {
        return sum + this.calculateDuration(instance.startedAt, instance.finishedAt);
      }
      return sum;
    }, 0);

    return totalTime / instances.length / (1000 * 60); // Convert to minutes
  }

  private calculateDuration(startDate: Date, endDate: Date): number {
    return endDate.getTime() - startDate.getTime();
  }

  private async calculateStepMetrics(whereConditions: any): Promise<any> {
    const stepExecutions = await this.stepExecutionRepository.find({
      where: whereConditions,
      relations: [ 'flowStep' ],
    });

    const totalSteps = stepExecutions.length;
    const completedSteps = stepExecutions.filter(step => step.status === StepExecutionStatus.DONE).length;
    const failedSteps = stepExecutions.filter(step => step.status === StepExecutionStatus.FAILED).length;

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      stepCompletionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    };
  }

  private async calculateWasteMetrics(whereConditions: any): Promise<any> {
    const wasteRecords = await this.wasteRecordRepository.find({
      where: whereConditions,
    });

    const totalWasteItems = wasteRecords.reduce((sum, waste) => sum + Number(waste.qty), 0);
    const totalWasteValue = wasteRecords.reduce((sum, waste) => sum + (Number(waste.costImpact) || 0), 0);

    return {
      totalWasteRecords: wasteRecords.length,
      totalWasteItems,
      totalWasteValue: Math.round(totalWasteValue * 100) / 100,
    };
  }

  private groupDataByPeriod(instances: FlowInstanceEntity[], groupBy: string): any[] {
    // Implementation for grouping data by day/week/month
    // This is a simplified version - you might want to use a proper date library
    const grouped = new Map();

    instances.forEach(instance => {
      const date = new Date(instance.createdAt);
      let key: string;

      switch (groupBy) {
        case 'week':
          key = this.getWeekKey(date);
          break;
        case 'month':
          key = this.getMonthKey(date);
          break;
        default:
          key = this.getDayKey(date);
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          totalInstances: 0,
          completedInstances: 0,
          cancelledInstances: 0,
          inProgressInstances: 0,
          completionRate: 0,
          avgExecutionTime: 0,
        });
      }

      const group = grouped.get(key);
      group.totalInstances++;

      if (instance.status === FlowInstanceStatus.FINISHED) group.completedInstances++;
      if (instance.status === FlowInstanceStatus.CANCELLED) group.cancelledInstances++;
      if (instance.status === FlowInstanceStatus.ACTIVE) group.inProgressInstances++;
    });

    // Calculate completion rates
    grouped.forEach(group => {
      group.completionRate = group.totalInstances > 0
        ? Math.round((group.completedInstances / group.totalInstances) * 100 * 100) / 100
        : 0;
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private getDayKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${ year }-W${ week.toString().padStart(2, '0') }`;
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${ year }-${ month.toString().padStart(2, '0') }`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private groupStepStatistics(stepDurations: any[]): any {
    const stats: any = {};

    stepDurations.forEach(step => {
      if (!stats[step.stepId]) {
        stats[step.stepId] = {
          stepId: step.stepId,
          stepName: step.stepName,
          executions: [],
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          totalExecutions: 0,
        };
      }

      const stat = stats[step.stepId];
      stat.executions.push(step.duration);
      stat.totalExecutions++;
      stat.minDuration = Math.min(stat.minDuration, step.duration);
      stat.maxDuration = Math.max(stat.maxDuration, step.duration);
    });

    // Calculate averages
    Object.values(stats).forEach((stat: any) => {
      stat.avgDuration = stat.executions.reduce((sum: number, duration: number) => sum + duration, 0) / stat.executions.length;
      stat.avgDuration = Math.round(stat.avgDuration / (1000 * 60)); // Convert to minutes
      stat.minDuration = Math.round(stat.minDuration / (1000 * 60));
      stat.maxDuration = Math.round(stat.maxDuration / (1000 * 60));
      delete stat.executions; // Remove raw data to reduce response size
    });

    return stats;
  }

  private calculateThroughput(instances: FlowInstanceEntity[], startDate: Date, endDate: Date): number {
    const completedInstances = instances.filter(i => i.status === FlowInstanceStatus.FINISHED).length;
    const periodDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return completedInstances / periodDays;
  }

  private calculateCycleTime(instances: FlowInstanceEntity[]): number {
    const completedWithTimes = instances.filter(
      i => i.status === FlowInstanceStatus.FINISHED && i.startedAt && i.finishedAt
    );
    return this.calculateAverageExecutionTime(completedWithTimes);
  }

  private calculateLeadTime(instances: FlowInstanceEntity[]): number {
    // Lead time from creation to completion
    const completedInstances = instances.filter(
      i => i.status === FlowInstanceStatus.FINISHED && i.finishedAt
    );

    if (completedInstances.length === 0) return 0;

    const totalLeadTime = completedInstances.reduce((sum, instance) => {
      return sum + this.calculateDuration(instance.createdAt, instance.finishedAt);
    }, 0);

    return totalLeadTime / completedInstances.length / (1000 * 60); // Convert to minutes
  }

  private calculateEfficiency(instances: FlowInstanceEntity[]): number {
    const total = instances.length;
    const completed = instances.filter(i => i.status === FlowInstanceStatus.FINISHED).length;
    return total > 0 ? (completed / total) * 100 : 0;
  }

  private async calculateQualityMetrics(whereConditions: any): Promise<any> {
    const stepExecutions = await this.stepExecutionRepository.find({
      where: whereConditions,
    });

    const totalSteps = stepExecutions.length;
    const failedSteps = stepExecutions.filter(step => step.status === StepExecutionStatus.FAILED).length;
    const reworkSteps = stepExecutions.filter(step => step.status === StepExecutionStatus.RESTARTED).length;

    return {
      defectRate: totalSteps > 0 ? (failedSteps / totalSteps) * 100 : 0,
      reworkRate: totalSteps > 0 ? (reworkSteps / totalSteps) * 100 : 0,
      firstPassYield: totalSteps > 0 ? ((totalSteps - failedSteps - reworkSteps) / totalSteps) * 100 : 0,
    };
  }

  private processWasteAnalysis(wasteRecords: WasteRecordEntity[]): any {
    const totalWaste = wasteRecords.length;
    const totalQuantity = wasteRecords.reduce((sum, waste) => sum + Number(waste.qty), 0);
    const totalValue = wasteRecords.reduce((sum, waste) => sum + (Number(waste.costImpact) || 0), 0);

    // Group by waste type (using reason as type since wasteType doesn't exist in entity)
    const wasteByType = wasteRecords.reduce((acc, waste) => {
      const wasteType = waste.reason || 'Unknown';
      if (!acc[wasteType]) {
        acc[wasteType] = {
          type: wasteType,
          count: 0,
          quantity: 0,
          value: 0,
        };
      }
      acc[wasteType].count++;
      acc[wasteType].quantity += Number(waste.qty);
      acc[wasteType].value += Number(waste.costImpact) || 0;
      return acc;
    }, {} as any);

    // Group by reason
    const wasteByReason = wasteRecords.reduce((acc, waste) => {
      const reason = waste.reason || 'Unknown';
      if (!acc[reason]) {
        acc[reason] = {
          reason,
          count: 0,
          quantity: 0,
          value: 0,
        };
      }
      acc[reason].count++;
      acc[reason].quantity += Number(waste.qty);
      acc[reason].value += Number(waste.costImpact) || 0;
      return acc;
    }, {} as any);

    return {
      summary: {
        totalWasteRecords: totalWaste,
        totalQuantity,
        totalValue: Math.round(totalValue * 100) / 100,
      },
      wasteByType: Object.values(wasteByType),
      wasteByReason: Object.values(wasteByReason),
      analysisDate: new Date().toISOString(),
    };
  }
}
