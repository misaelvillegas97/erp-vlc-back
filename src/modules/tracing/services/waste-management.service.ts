import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { WasteRecordEntity }                                  from '../domain/entities/waste-record.entity';
import { StepExecutionEntity }                                from '../domain/entities/step-execution.entity';
import { CreateWasteRecordDto }                               from '../domain/dto/execution/create-waste-record.dto';
import { WasteRecordResponseDto }                             from '../domain/dto/execution/waste-record-response.dto';
import { WasteSummaryDto }                                    from '../domain/dto/execution/waste-summary.dto';

/**
 * Service for managing waste records and inventory impact
 * Handles waste tracking, cost calculation, and inventory adjustments
 */
@Injectable()
export class WasteManagementService {
  constructor(
    @InjectRepository(WasteRecordEntity)
    private readonly wasteRecordRepository: Repository<WasteRecordEntity>,
    @InjectRepository(StepExecutionEntity)
    private readonly stepExecutionRepository: Repository<StepExecutionEntity>,
  ) {}

  /**
   * Create a new waste record
   */
  async createWasteRecord(createDto: CreateWasteRecordDto): Promise<WasteRecordResponseDto> {
    // Verify step execution exists
    const stepExecution = await this.stepExecutionRepository.findOne({
      where: {id: createDto.stepExecutionId},
      relations: [ 'instance', 'step' ],
    });

    if (!stepExecution) {
      throw new NotFoundException(`Step execution with ID "${ createDto.stepExecutionId }" not found`);
    }

    // Calculate cost impact if not provided
    let costImpact = createDto.costImpact;
    if (!costImpact && createDto.sku && createDto.qty) {
      costImpact = await this.calculateCostImpact(createDto.sku, createDto.qty);
    }

    const wasteRecord = new WasteRecordEntity();
    wasteRecord.stepExecutionId = createDto.stepExecutionId;
    wasteRecord.qty = createDto.qty;
    wasteRecord.reason = createDto.reason;
    wasteRecord.affectsInventory = createDto.affectsInventory ?? false;
    wasteRecord.evidenceUrl = createDto.evidenceUrl;
    wasteRecord.costImpact = costImpact;
    wasteRecord.sku = createDto.sku;
    wasteRecord.lot = createDto.lot;
    wasteRecord.notes = createDto.notes;
    wasteRecord.metadata = createDto.metadata;
    wasteRecord.recordedBy = createDto.recordedBy;
    wasteRecord.recordedAt = new Date();
    wasteRecord.inventoryAdjusted = false;

    const savedWasteRecord = await this.wasteRecordRepository.save(wasteRecord);

    // Process inventory adjustment if needed
    if (savedWasteRecord.affectsInventory && savedWasteRecord.sku) {
      await this.processInventoryAdjustment(savedWasteRecord);
    }

    return this.mapToResponseDto(savedWasteRecord);
  }

  /**
   * Find waste records by step execution
   */
  async findWasteRecordsByStepExecution(stepExecutionId: string): Promise<WasteRecordResponseDto[]> {
    const wasteRecords = await this.wasteRecordRepository.find({
      where: {stepExecutionId},
      relations: [ 'stepExecution', 'stepExecution.step', 'stepExecution.instance' ],
      order: {recordedAt: 'DESC'},
    });

    return wasteRecords.map(wr => this.mapToResponseDto(wr));
  }

  /**
   * Find waste records by flow instance
   */
  async findWasteRecordsByInstance(
    instanceId: string,
    filters?: {
      sku?: string;
      reason?: string;
      affectsInventory?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<WasteRecordResponseDto[]> {
    const queryBuilder = this.wasteRecordRepository.createQueryBuilder('wasteRecord')
      .leftJoinAndSelect('wasteRecord.stepExecution', 'stepExecution')
      .leftJoinAndSelect('stepExecution.step', 'step')
      .leftJoinAndSelect('stepExecution.instance', 'instance')
      .where('instance.id = :instanceId', {instanceId});

    if (filters?.sku) {
      queryBuilder.andWhere('wasteRecord.sku = :sku', {sku: filters.sku});
    }

    if (filters?.reason) {
      queryBuilder.andWhere('wasteRecord.reason ILIKE :reason', {reason: `%${ filters.reason }%`});
    }

    if (filters?.affectsInventory !== undefined) {
      queryBuilder.andWhere('wasteRecord.affectsInventory = :affectsInventory', {
        affectsInventory: filters.affectsInventory
      });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('wasteRecord.recordedAt >= :dateFrom', {dateFrom: filters.dateFrom});
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('wasteRecord.recordedAt <= :dateTo', {dateTo: filters.dateTo});
    }

    queryBuilder.orderBy('wasteRecord.recordedAt', 'DESC');

    const wasteRecords = await queryBuilder.getMany();
    return wasteRecords.map(wr => this.mapToResponseDto(wr));
  }

  /**
   * Get waste summary for an instance
   */
  async getWasteSummaryByInstance(instanceId: string): Promise<WasteSummaryDto> {
    const queryBuilder = this.wasteRecordRepository.createQueryBuilder('wasteRecord')
      .leftJoin('wasteRecord.stepExecution', 'stepExecution')
      .leftJoin('stepExecution.instance', 'instance')
      .where('instance.id = :instanceId', {instanceId});

    const wasteRecords = await queryBuilder.getMany();

    const summary = new WasteSummaryDto();
    summary.totalRecords = wasteRecords.length;
    summary.totalQuantity = wasteRecords.reduce((sum, wr) => sum + Number(wr.qty), 0);
    summary.totalValue = wasteRecords.reduce((sum, wr) => sum + (Number(wr.costImpact) || 0), 0);
    summary.averageWastePerRecord = summary.totalRecords > 0 ? summary.totalQuantity / summary.totalRecords : 0;
    summary.averageValuePerRecord = summary.totalRecords > 0 ? summary.totalValue / summary.totalRecords : 0;
    summary.periodStart = new Date().toISOString(); // Default to current date
    summary.periodEnd = new Date().toISOString();

    // Group by reason
    const reasonMap = new Map<string, { count: number; quantity: number; costImpact: number }>();
    for (const wasteRecord of wasteRecords) {
      const reason = wasteRecord.reason;
      if (!reasonMap.has(reason)) {
        reasonMap.set(reason, {count: 0, quantity: 0, costImpact: 0});
      }
      const reasonData = reasonMap.get(reason)!;
      reasonData.count++;
      reasonData.quantity += Number(wasteRecord.qty);
      reasonData.costImpact += Number(wasteRecord.costImpact) || 0;
    }

    summary.byReason = Array.from(reasonMap.entries()).map(([ reason, data ]) => ({
      reason,
      count: data.count,
      quantity: data.quantity,
      value: data.costImpact,
      percentage: summary.totalQuantity > 0 ? (data.quantity / summary.totalQuantity) * 100 : 0,
    }));

    // Create byType and byCategory arrays (using reason as type/category since we don't have separate fields)
    summary.byType = Array.from(reasonMap.entries()).map(([ reason, data ]) => ({
      type: reason,
      count: data.count,
      quantity: data.quantity,
      value: data.costImpact,
      percentage: summary.totalQuantity > 0 ? (data.quantity / summary.totalQuantity) * 100 : 0,
    }));

    summary.byCategory = Array.from(reasonMap.entries()).map(([ reason, data ]) => ({
      category: reason,
      count: data.count,
      quantity: data.quantity,
      value: data.costImpact,
      percentage: summary.totalQuantity > 0 ? (data.quantity / summary.totalQuantity) * 100 : 0,
    }));

    return summary;
  }

  /**
   * Update waste record
   */
  async updateWasteRecord(
    id: string,
    updateData: Partial<CreateWasteRecordDto>
  ): Promise<WasteRecordResponseDto> {
    const wasteRecord = await this.wasteRecordRepository.findOne({
      where: {id},
      relations: [ 'stepExecution' ],
    });

    if (!wasteRecord) {
      throw new NotFoundException(`Waste record with ID "${ id }" not found`);
    }

    // Check if step execution is still modifiable
    if (wasteRecord.stepExecution.status === 'DONE' && !updateData.notes) {
      throw new BadRequestException('Cannot modify waste record for completed step execution');
    }

    // Recalculate cost impact if quantity or SKU changed
    if ((updateData.qty && updateData.qty !== wasteRecord.qty) ||
      (updateData.sku && updateData.sku !== wasteRecord.sku)) {
      const sku = updateData.sku || wasteRecord.sku;
      const qty = updateData.qty || wasteRecord.qty;
      if (sku) {
        updateData.costImpact = await this.calculateCostImpact(sku, qty);
      }
    }

    Object.assign(wasteRecord, updateData);
    const savedWasteRecord = await this.wasteRecordRepository.save(wasteRecord);

    // Reprocess inventory adjustment if needed
    if (savedWasteRecord.affectsInventory && savedWasteRecord.sku && !savedWasteRecord.inventoryAdjusted) {
      await this.processInventoryAdjustment(savedWasteRecord);
    }

    return this.mapToResponseDto(savedWasteRecord);
  }

  /**
   * Delete waste record
   */
  async deleteWasteRecord(id: string): Promise<void> {
    const wasteRecord = await this.wasteRecordRepository.findOne({
      where: {id},
      relations: [ 'stepExecution' ],
    });

    if (!wasteRecord) {
      throw new NotFoundException(`Waste record with ID "${ id }" not found`);
    }

    if (wasteRecord.stepExecution.status === 'DONE') {
      throw new BadRequestException('Cannot delete waste record for completed step execution');
    }

    if (wasteRecord.inventoryAdjusted) {
      throw new BadRequestException('Cannot delete waste record that has already affected inventory');
    }

    await this.wasteRecordRepository.remove(wasteRecord);
  }

  /**
   * Process inventory adjustment for waste record
   */
  async processInventoryAdjustment(wasteRecord: WasteRecordEntity): Promise<void> {
    if (!wasteRecord.sku || wasteRecord.inventoryAdjusted) {
      return;
    }

    try {
      // TODO: Integrate with inventory module
      // This would call the inventory service to adjust stock levels
      // await this.inventoryService.adjustInventory({
      //   sku: wasteRecord.sku,
      //   quantity: -wasteRecord.qty, // Negative for waste
      //   reason: `Waste: ${wasteRecord.reason}`,
      //   lot: wasteRecord.lot,
      //   reference: `waste-${wasteRecord.id}`,
      //   metadata: {
      //     wasteRecordId: wasteRecord.id,
      //     stepExecutionId: wasteRecord.stepExecutionId,
      //   }
      // });

      // Mark as adjusted
      wasteRecord.inventoryAdjusted = true;
      wasteRecord.adjustmentProcessedAt = new Date();
      await this.wasteRecordRepository.save(wasteRecord);

    } catch (error) {
      console.error(`Failed to process inventory adjustment for waste record ${ wasteRecord.id }:`, error);
      // Don't throw error to avoid blocking the main flow
    }
  }

  /**
   * Get waste trends and analytics
   */
  async getWasteTrends(
    filters: {
      templateId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      groupBy?: 'day' | 'week' | 'month';
    }
  ): Promise<{
    trends: Array<{
      period: string;
      totalQuantity: number;
      totalCostImpact: number;
      recordCount: number;
    }>;
    topReasons: Array<{
      reason: string;
      quantity: number;
      costImpact: number;
      percentage: number;
    }>;
    topSkus: Array<{
      sku: string;
      quantity: number;
      costImpact: number;
      percentage: number;
    }>;
  }> {
    const queryBuilder = this.wasteRecordRepository.createQueryBuilder('wasteRecord')
      .leftJoin('wasteRecord.stepExecution', 'stepExecution')
      .leftJoin('stepExecution.instance', 'instance')
      .leftJoin('instance.template', 'template');

    if (filters.templateId) {
      queryBuilder.andWhere('template.id = :templateId', {templateId: filters.templateId});
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('wasteRecord.recordedAt >= :dateFrom', {dateFrom: filters.dateFrom});
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('wasteRecord.recordedAt <= :dateTo', {dateTo: filters.dateTo});
    }

    const wasteRecords = await queryBuilder.getMany();

    // Calculate trends (simplified implementation)
    const trends = this.calculateTrends(wasteRecords, filters.groupBy || 'day');

    // Calculate top reasons
    const reasonMap = new Map<string, { quantity: number; costImpact: number }>();
    let totalQuantity = 0;
    let totalCostImpact = 0;

    for (const record of wasteRecords) {
      const qty = Number(record.qty);
      const cost = Number(record.costImpact) || 0;
      totalQuantity += qty;
      totalCostImpact += cost;

      if (!reasonMap.has(record.reason)) {
        reasonMap.set(record.reason, {quantity: 0, costImpact: 0});
      }
      const reasonData = reasonMap.get(record.reason)!;
      reasonData.quantity += qty;
      reasonData.costImpact += cost;
    }

    const topReasons = Array.from(reasonMap.entries())
      .map(([ reason, data ]) => ({
        reason,
        quantity: data.quantity,
        costImpact: data.costImpact,
        percentage: totalQuantity > 0 ? (data.quantity / totalQuantity) * 100 : 0,
        costPercentage: totalCostImpact > 0 ? (data.costImpact / totalCostImpact) * 100 : 0,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Calculate top SKUs
    const skuMap = new Map<string, { quantity: number; costImpact: number }>();
    for (const record of wasteRecords.filter(r => r.sku)) {
      const sku = record.sku!;
      const qty = Number(record.qty);
      const cost = Number(record.costImpact) || 0;

      if (!skuMap.has(sku)) {
        skuMap.set(sku, {quantity: 0, costImpact: 0});
      }
      const skuData = skuMap.get(sku)!;
      skuData.quantity += qty;
      skuData.costImpact += cost;
    }

    const topSkus = Array.from(skuMap.entries())
      .map(([ sku, data ]) => ({
        sku,
        quantity: data.quantity,
        costImpact: data.costImpact,
        percentage: totalQuantity > 0 ? (data.quantity / totalQuantity) * 100 : 0,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      trends,
      topReasons,
      topSkus,
    };
  }

  /**
   * Calculate cost impact for waste
   */
  private calculateCostImpact(sku: string, qty: number): number {
    try {
      // TODO: Integrate with inventory/product module to get cost per unit
      // This would call the product service to get the cost
      // const product = this.productService.findBySku(sku);
      // return product.cost * qty;

      // For now, return 0 as placeholder (qty will be used when integration is implemented)
      console.log(`Calculating cost impact for SKU ${ sku }, quantity: ${ qty }`);
      return 0;
    } catch (error) {
      console.error(`Failed to calculate cost impact for SKU ${ sku }:`, error);
      return 0;
    }
  }

  /**
   * Calculate trends by period
   */
  private calculateTrends(
    wasteRecords: WasteRecordEntity[],
    groupBy: 'day' | 'week' | 'month'
  ): Array<{
    period: string;
    totalQuantity: number;
    totalCostImpact: number;
    recordCount: number;
  }> {
    const trendsMap = new Map<string, { quantity: number; costImpact: number; count: number }>();

    for (const record of wasteRecords) {
      const date = new Date(record.recordedAt);
      let period: string;

      switch (groupBy) {
        case 'day':
          period = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          period = `${ date.getFullYear() }-${ String(date.getMonth() + 1).padStart(2, '0') }`;
          break;
        default:
          period = date.toISOString().split('T')[0];
      }

      if (!trendsMap.has(period)) {
        trendsMap.set(period, {quantity: 0, costImpact: 0, count: 0});
      }

      const trendData = trendsMap.get(period)!;
      trendData.quantity += Number(record.qty);
      trendData.costImpact += Number(record.costImpact) || 0;
      trendData.count++;
    }

    return Array.from(trendsMap.entries())
      .map(([ period, data ]) => ({
        period,
        totalQuantity: data.quantity,
        totalCostImpact: data.costImpact,
        recordCount: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(wasteRecord: WasteRecordEntity): WasteRecordResponseDto {
    const dto = new WasteRecordResponseDto();
    dto.id = wasteRecord.id;
    dto.stepExecutionId = wasteRecord.stepExecutionId;
    dto.wasteType = 'material_waste'; // Default type since not in entity
    dto.quantity = wasteRecord.qty || 0;
    dto.unit = 'units'; // Default unit since not in entity
    dto.unitValue = wasteRecord.costImpact || 0;
    dto.totalValue = (wasteRecord.qty || 0) * (wasteRecord.costImpact || 0);
    dto.reason = wasteRecord.reason;
    dto.category = 'operational'; // Default category since not in entity
    dto.notes = wasteRecord.notes;
    dto.recordedBy = wasteRecord.recordedBy;
    dto.recordedByName = undefined; // Not available in entity
    dto.recordedAt = wasteRecord.recordedAt?.toISOString() || new Date().toISOString();
    dto.createdAt = wasteRecord.createdAt?.toISOString() || new Date().toISOString();
    dto.updatedAt = wasteRecord.updatedAt?.toISOString() || new Date().toISOString();
    dto.metadata = wasteRecord.metadata;
    dto.status = 'confirmed'; // Default status since not in entity
    dto.disposalMethod = undefined; // Not available in entity
    dto.disposalCost = undefined; // Not available in entity
    dto.environmentalImpact = undefined; // Not available in entity
    dto.preventable = undefined; // Not available in entity
    dto.correctiveActions = undefined; // Not available in entity

    // Add step execution information if available
    if (wasteRecord.stepExecution) {
      dto.stepName = wasteRecord.stepExecution.step?.name;
      dto.instanceId = wasteRecord.stepExecution.instanceId;
    }

    return dto;
  }
}
