import { Injectable, Logger, NotFoundException }           from '@nestjs/common';
import { InjectRepository }                                from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository }    from 'typeorm';
import { FuelRecordEntity }                                from '../domain/entities/fuel-record.entity';
import { CreateFuelRecordDto }                             from '../domain/dto/create-fuel-record.dto';
import { UpdateFuelRecordDto }                             from '../domain/dto/update-fuel-record.dto';
import { QueryFuelRecordDto }                              from '../domain/dto/query-fuel-record.dto';
import { VehiclesService }                                 from './vehicles.service';
import { FuelConsumptionByPeriod, FuelConsumptionSummary } from '../domain/interfaces/fuel-consumption.interface';
import { DateTime }                                        from 'luxon';

/**
 * Service for managing fuel records
 */
@Injectable()
export class FuelService {
  private readonly logger = new Logger(FuelService.name);

  constructor(
    @InjectRepository(FuelRecordEntity)
    private readonly fuelRecordRepository: Repository<FuelRecordEntity>,
    private readonly vehiclesService: VehiclesService
  ) {}

  /**
   * Find all fuel records with optional filtering
   * @param query Query parameters for filtering
   * @returns Array of fuel records and total count
   */
  async findAll(query: QueryFuelRecordDto): Promise<[ FuelRecordEntity[], number ]> {
    const take = query.limit || 10;
    const skip = ((query.page || 1) - 1) * take;

    const where: FindOptionsWhere<FuelRecordEntity> = {};

    if (query.vehicleId) {
      where.vehicleId = query.vehicleId;
    }

    if (query.startDate && query.endDate) {
      where.date = Between(
        query.startDate.toISOString().split('T')[0],
        query.endDate.toISOString().split('T')[0]
      );
    } else if (query.startDate) {
      where.date = Between(
        query.startDate.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );
    } else if (query.endDate) {
      where.date = Between(
        '1970-01-01',
        query.endDate.toISOString().split('T')[0]
      );
    }

    if (query.gasStation) {
      where.gasStation = query.gasStation;
    }

    if (query.search) {
      where.notes = ILike(`%${ query.search }%`);
    }

    return this.fuelRecordRepository.findAndCount({
      where,
      take,
      skip,
      order: {date: 'DESC'},
      relations: [ 'vehicle', 'user' ]
    });
  }

  /**
   * Find a fuel record by ID
   * @param id Fuel record ID
   * @returns Fuel record entity
   */
  async findById(id: string): Promise<FuelRecordEntity> {
    const fuelRecord = await this.fuelRecordRepository.findOne({
      where: {id},
      relations: [ 'vehicle', 'user' ]
    });

    if (!fuelRecord) {
      throw new NotFoundException(`Fuel record with ID ${ id } not found`);
    }

    return fuelRecord;
  }

  /**
   * Find fuel records by vehicle ID
   * @param vehicleId Vehicle ID
   * @returns Array of fuel records
   */
  async findByVehicleId(vehicleId: string): Promise<FuelRecordEntity[]> {
    return this.fuelRecordRepository.find({
      where: {vehicleId},
      order: {date: 'DESC'},
      relations: [ 'user' ]
    });
  }

  /**
   * Create a new fuel record
   * @param userId ID of the user creating the record
   * @param createFuelRecordDto DTO with fuel record data
   * @returns Created fuel record entity
   */
  async create(userId: string, createFuelRecordDto: CreateFuelRecordDto): Promise<FuelRecordEntity> {
    // Verify vehicle exists
    await this.vehiclesService.findById(createFuelRecordDto.vehicleId);

    const fuelRecord = this.fuelRecordRepository.create({
      ...createFuelRecordDto,
      userId,
      date: createFuelRecordDto.date.toISOString().split('T')[0]
    });

    // Calculate efficiency and cost per km
    fuelRecord.calculateMetrics();

    // Update vehicle's odometer if final odometer is greater than current
    const vehicle = await this.vehiclesService.findById(createFuelRecordDto.vehicleId);
    if (createFuelRecordDto.finalOdometer > vehicle.lastKnownOdometer) {
      await this.vehiclesService.updateOdometer(
        createFuelRecordDto.vehicleId,
        createFuelRecordDto.finalOdometer
      );
    }

    return this.fuelRecordRepository.save(fuelRecord);
  }

  /**
   * Update an existing fuel record
   * @param id Fuel record ID
   * @param updateFuelRecordDto DTO with updated fuel record data
   * @returns Updated fuel record entity
   */
  async update(id: string, updateFuelRecordDto: UpdateFuelRecordDto): Promise<FuelRecordEntity> {
    const fuelRecord = await this.findById(id);

    // If vehicle ID is changing, verify the new vehicle exists
    if (updateFuelRecordDto.vehicleId && updateFuelRecordDto.vehicleId !== fuelRecord.vehicleId) {
      await this.vehiclesService.findById(updateFuelRecordDto.vehicleId);
    }

    // Update fields
    Object.assign(fuelRecord, updateFuelRecordDto);

    // Convert date if provided
    if (updateFuelRecordDto.date) {
      fuelRecord.date = updateFuelRecordDto.date.toISOString().split('T')[0];
    }

    // Recalculate metrics if relevant fields were updated
    if (
      updateFuelRecordDto.initialOdometer !== undefined ||
      updateFuelRecordDto.finalOdometer !== undefined ||
      updateFuelRecordDto.liters !== undefined ||
      updateFuelRecordDto.cost !== undefined
    ) {
      fuelRecord.calculateMetrics();
    }

    // Update vehicle's odometer if final odometer is greater than current
    if (updateFuelRecordDto.finalOdometer) {
      const vehicle = await this.vehiclesService.findById(fuelRecord.vehicleId);
      if (updateFuelRecordDto.finalOdometer > vehicle.lastKnownOdometer) {
        await this.vehiclesService.updateOdometer(
          fuelRecord.vehicleId,
          updateFuelRecordDto.finalOdometer
        );
      }
    }

    return this.fuelRecordRepository.save(fuelRecord);
  }

  /**
   * Delete a fuel record
   * @param id Fuel record ID
   */
  async delete(id: string): Promise<void> {
    const fuelRecord = await this.findById(id);
    await this.fuelRecordRepository.remove(fuelRecord);
  }

  /**
   * Get fuel consumption summary for a specific vehicle or all vehicles
   * @param vehicleId Optional vehicle ID to filter by
   * @param startDate Optional start date to filter by
   * @param endDate Optional end date to filter by
   * @returns Fuel consumption summary
   */
  async getFuelConsumptionSummary(
    vehicleId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelConsumptionSummary[]> {
    let query = this.fuelRecordRepository
      .createQueryBuilder('fuelRecord')
      .leftJoinAndSelect('fuelRecord.vehicle', 'vehicle');

    if (vehicleId) {
      query = query.where('fuelRecord.vehicleId = :vehicleId', {vehicleId});
    }

    if (startDate && endDate) {
      query = query.andWhere('fuelRecord.date BETWEEN :startDate AND :endDate', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    } else if (startDate) {
      query = query.andWhere('fuelRecord.date >= :startDate', {
        startDate: startDate.toISOString().split('T')[0]
      });
    } else if (endDate) {
      query = query.andWhere('fuelRecord.date <= :endDate', {
        endDate: endDate.toISOString().split('T')[0]
      });
    }

    const records = await query.getMany();

    // Group records by vehicle
    const vehicleGroups = new Map<string, FuelRecordEntity[]>();
    records.forEach(record => {
      if (!vehicleGroups.has(record.vehicleId)) {
        vehicleGroups.set(record.vehicleId, []);
      }
      vehicleGroups.get(record.vehicleId)?.push(record);
    });

    // Calculate summaries for each vehicle
    const summaries: FuelConsumptionSummary[] = [];
    for (const [ vehicleId, vehicleRecords ] of vehicleGroups.entries()) {
      if (vehicleRecords.length === 0) continue;

      const vehicle = vehicleRecords[0].vehicle;

      let totalLiters = 0;
      let totalCost = 0;
      let totalDistance = 0;
      let efficiencySum = 0;
      let validEfficiencyCount = 0;

      vehicleRecords.forEach(record => {
        totalLiters += record.liters;
        totalCost += record.cost;

        const distance = record.finalOdometer - record.initialOdometer;
        totalDistance += distance;

        if (record.efficiency) {
          efficiencySum += record.efficiency;
          validEfficiencyCount++;
        }
      });

      summaries.push({
        vehicleId,
        vehicleInfo: {
          brand: vehicle.brand,
          model: vehicle.model,
          licensePlate: vehicle.licensePlate
        },
        totalRecords: vehicleRecords.length,
        totalLiters,
        totalCost,
        totalDistance,
        averageEfficiency: validEfficiencyCount > 0 ? efficiencySum / validEfficiencyCount : 0,
        averageCostPerKm: totalDistance > 0 ? totalCost / totalDistance : 0
      });
    }

    return summaries;
  }

  /**
   * Get fuel consumption analysis by period (month)
   * @param vehicleId Optional vehicle ID to filter by
   * @param startDate Optional start date to filter by
   * @param endDate Optional end date to filter by
   * @returns Fuel consumption by period
   */
  async getFuelConsumptionByPeriod(
    vehicleId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelConsumptionByPeriod[]> {
    let query = this.fuelRecordRepository
      .createQueryBuilder('fuelRecord');

    if (vehicleId) {
      query = query.where('fuelRecord.vehicleId = :vehicleId', {vehicleId});
    }

    if (startDate && endDate) {
      query = query.andWhere('fuelRecord.date BETWEEN :startDate AND :endDate', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    } else if (startDate) {
      query = query.andWhere('fuelRecord.date >= :startDate', {
        startDate: startDate.toISOString().split('T')[0]
      });
    } else if (endDate) {
      query = query.andWhere('fuelRecord.date <= :endDate', {
        endDate: endDate.toISOString().split('T')[0]
      });
    }

    const records = await query.getMany();

    // Group records by month
    const periodGroups = new Map<string, FuelRecordEntity[]>();
    records.forEach(record => {
      const date = DateTime.fromISO(record.date);
      const period = `${ date.year }-${ date.month.toString().padStart(2, '0') }`;

      if (!periodGroups.has(period)) {
        periodGroups.set(period, []);
      }
      periodGroups.get(period)?.push(record);
    });

    // Calculate summaries for each period
    const periodSummaries: FuelConsumptionByPeriod[] = [];
    for (const [ period, periodRecords ] of periodGroups.entries()) {
      let totalLiters = 0;
      let totalCost = 0;
      let totalDistance = 0;
      let efficiencySum = 0;
      let validEfficiencyCount = 0;

      periodRecords.forEach(record => {
        totalLiters += record.liters;
        totalCost += record.cost;

        const distance = record.finalOdometer - record.initialOdometer;
        totalDistance += distance;

        if (record.efficiency) {
          efficiencySum += record.efficiency;
          validEfficiencyCount++;
        }
      });

      periodSummaries.push({
        period,
        totalLiters,
        totalCost,
        totalDistance,
        averageEfficiency: validEfficiencyCount > 0 ? efficiencySum / validEfficiencyCount : 0
      });
    }

    // Sort by period (newest first)
    return periodSummaries.sort((a, b) => b.period.localeCompare(a.period));
  }
}
