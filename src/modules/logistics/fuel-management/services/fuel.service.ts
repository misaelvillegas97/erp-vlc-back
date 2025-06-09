import { Injectable, Logger, NotFoundException }           from '@nestjs/common';
import { InjectRepository }                                from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository }    from 'typeorm';
import { FuelRecordEntity }                                from '../domain/entities/fuel-record.entity';
import { CreateFuelRecordDto }                             from '../domain/dto/create-fuel-record.dto';
import { UpdateFuelRecordDto }                             from '../domain/dto/update-fuel-record.dto';
import { QueryFuelRecordDto }                              from '../domain/dto/query-fuel-record.dto';
import { VehiclesService }                                 from '../../fleet-management/services/vehicles.service';
import { FuelConsumptionByPeriod, FuelConsumptionSummary } from '../domain/interfaces/fuel-consumption.interface';
import { DateTime }                                        from 'luxon';
import { EventEmitter2 }                                   from '@nestjs/event-emitter';
import { FuelRecordMapper }                                from '../domain/mappers/fuel-record.mapper';
import { FuelConsumptionSummaryMapper }                    from '../domain/mappers/fuel-consumption-summary.mapper';
import { FuelConsumptionByPeriodMapper }                   from '../domain/mappers/fuel-consumption-by-period.mapper';
import { VehicleMapper }                                   from '@modules/logistics/fleet-management/domain/mappers/vehicle.mapper';
import { BigNumber }                                       from 'bignumber.js';

/**
 * Service for managing fuel records
 */
@Injectable()
export class FuelService {
  private readonly logger = new Logger(FuelService.name);

  constructor(
    @InjectRepository(FuelRecordEntity)
    private readonly fuelRecordRepository: Repository<FuelRecordEntity>,
    private readonly vehiclesService: VehiclesService,
    private readonly eventEmitter: EventEmitter2
  ) {
    BigNumber.config({
      DECIMAL_PLACES: 2,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP
    });

  }

  /**
   * Find all fuel records with optional filtering
   * @param query Query parameters for filtering
   * @returns Array of fuel record mappers and total count
   */
  async findAll(query: QueryFuelRecordDto): Promise<[ FuelRecordMapper[], number ]> {
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

    const [ entities, count ] = await this.fuelRecordRepository.findAndCount({
      where,
      take,
      skip,
      order: {date: 'DESC'},
      relations: [ 'vehicle', 'user' ]
    });

    return [ FuelRecordMapper.toDomainAll(entities), count ];
  }

  /**
   * Find a fuel record by ID
   * @param id Fuel record ID
   * @returns Fuel record mapper
   */
  async findById(id: string): Promise<FuelRecordMapper> {
    const fuelRecord = await this.fuelRecordRepository.findOne({
      where: {id},
      relations: [ 'vehicle', 'user' ]
    });

    if (!fuelRecord) {
      throw new NotFoundException(`Fuel record with ID ${ id } not found`);
    }

    return FuelRecordMapper.toDomain(fuelRecord);
  }

  /**
   * Find fuel records by vehicle ID
   * @param vehicleId Vehicle ID
   * @returns Array of fuel record mappers
   */
  async findByVehicleId(vehicleId: string): Promise<FuelRecordMapper[]> {
    const entities = await this.fuelRecordRepository.find({
      where: {vehicleId},
      order: {date: 'DESC'},
      relations: [ 'user' ]
    });

    return FuelRecordMapper.toDomainAll(entities);
  }

  /**
   * Create a new fuel record
   * @param userId ID of the user creating the record
   * @param createFuelRecordDto DTO with fuel record data
   * @returns Created fuel record mapper
   */
  async create(userId: string, createFuelRecordDto: CreateFuelRecordDto): Promise<FuelRecordMapper> {
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

    await this.vehiclesService.updateLastRefuelingOdometer(
      createFuelRecordDto.vehicleId,
      createFuelRecordDto.finalOdometer
    );

    const savedEntity = await this.fuelRecordRepository.save(fuelRecord);
    return FuelRecordMapper.toDomain(savedEntity);
  }

  /**
   * Update an existing fuel record
   * @param id Fuel record ID
   * @param updateFuelRecordDto DTO with updated fuel record data
   * @returns Updated fuel record mapper
   */
  async update(id: string, updateFuelRecordDto: UpdateFuelRecordDto): Promise<FuelRecordMapper> {
    // Get the original entity from the repository
    const originalEntity = await this.fuelRecordRepository.findOne({
      where: {id},
      relations: [ 'vehicle', 'user' ]
    });

    if (!originalEntity) {
      throw new NotFoundException(`Fuel record with ID ${ id } not found`);
    }

    // If vehicle ID is changing, verify the new vehicle exists
    if (updateFuelRecordDto.vehicleId && updateFuelRecordDto.vehicleId !== originalEntity.vehicleId) {
      await this.vehiclesService.findById(updateFuelRecordDto.vehicleId);
    }

    // Update fields
    Object.assign(originalEntity, updateFuelRecordDto);

    // Convert date if provided
    if (updateFuelRecordDto.date) {
      originalEntity.date = updateFuelRecordDto.date.toISOString().split('T')[0];
    }

    // Recalculate metrics if relevant fields were updated
    if (
      updateFuelRecordDto.initialOdometer !== undefined ||
      updateFuelRecordDto.finalOdometer !== undefined ||
      updateFuelRecordDto.liters !== undefined ||
      updateFuelRecordDto.cost !== undefined
    ) {
      originalEntity.calculateMetrics();
    }

    // Update vehicle's odometer if final odometer is greater than current
    if (updateFuelRecordDto.finalOdometer) {
      const vehicle = await this.vehiclesService.findById(originalEntity.vehicleId);
      if (updateFuelRecordDto.finalOdometer > vehicle.lastKnownOdometer) {
        await this.vehiclesService.updateOdometer(
          originalEntity.vehicleId,
          updateFuelRecordDto.finalOdometer
        );
      }
    }

    const updatedEntity = await this.fuelRecordRepository.save(originalEntity);
    return FuelRecordMapper.toDomain(updatedEntity);
  }

  /**
   * Delete a fuel record
   * @param id Fuel record ID
   */
  async delete(id: string): Promise<void> {
    const fuelRecord = await this.fuelRecordRepository.findOne({
      where: {id}
    });

    if (!fuelRecord)
      throw new NotFoundException(`Fuel record with ID ${ id } not found`);

    await this.fuelRecordRepository.remove(fuelRecord);
  }

  /**
   * Get fuel consumption summary for a specific vehicle or all vehicles
   * @param vehicleId Optional vehicle ID to filter by
   * @param startDate Optional start date to filter by
   * @param endDate Optional end date to filter by
   * @returns Fuel consumption summary mappers
   */
  async getFuelConsumptionSummary(
    vehicleId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelConsumptionSummaryMapper[]> {
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

    // Calculate summaries for each vehicle using BigNumber
    const summaries: FuelConsumptionSummary[] = [];
    for (const [ vehicleId, vehicleRecords ] of vehicleGroups.entries()) {
      if (vehicleRecords.length === 0) continue;

      const vehicle = vehicleRecords[0].vehicle;

      let totalLiters = new BigNumber(0);
      let totalCost = new BigNumber(0);
      let totalDistance = new BigNumber(0);
      let efficiencySum = new BigNumber(0);
      let validEfficiencyCount = 0;

      vehicleRecords.forEach(record => {
        totalLiters = totalLiters.plus(new BigNumber(record.liters));
        totalCost = totalCost.plus(new BigNumber(record.cost));

        const distance = new BigNumber(record.finalOdometer).minus(new BigNumber(record.initialOdometer));
        totalDistance = totalDistance.plus(distance);

        if (record.efficiency) {
          efficiencySum = efficiencySum.plus(new BigNumber(record.efficiency));
          validEfficiencyCount++;
        }
      });

      const averageEfficiency = validEfficiencyCount > 0
        ? efficiencySum.dividedBy(new BigNumber(validEfficiencyCount))
        : new BigNumber(0);

      const averageCostPerKm = totalDistance.isGreaterThan(0)
        ? totalCost.dividedBy(totalDistance)
        : new BigNumber(0);

      summaries.push({
        vehicleId,
        vehicle: {
          brand: vehicle.brand,
          model: vehicle.model,
          licensePlate: vehicle.licensePlate,
          displayName: VehicleMapper.getDisplayName(vehicle)
        },
        totalRecords: vehicleRecords.length,
        totalLiters: totalLiters.toNumber(),
        totalCost: totalCost.toNumber(),
        totalDistance: totalDistance.toNumber(),
        averageEfficiency: averageEfficiency.toNumber(),
        averageCostPerKm: averageCostPerKm.toNumber()
      });
    }

    return FuelConsumptionSummaryMapper.toDomainAll(summaries);
  }


  /**
   * Get fuel consumption analysis by period (month)
   * @param vehicleId Optional vehicle ID to filter by
   * @param startDate Optional start date to filter by
   * @param endDate Optional end date to filter by
   * @returns Fuel consumption by period mappers
   */
  async getFuelConsumptionByPeriod(
    vehicleId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelConsumptionByPeriodMapper[]> {
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

    // Calculate summaries for each period using BigNumber
    const periodSummaries: FuelConsumptionByPeriod[] = [];
    for (const [ period, periodRecords ] of periodGroups.entries()) {
      let totalLiters = new BigNumber(0);
      let totalCost = new BigNumber(0);
      let totalDistance = new BigNumber(0);
      let efficiencySum = new BigNumber(0);
      let validEfficiencyCount = 0;

      periodRecords.forEach(record => {
        totalLiters = totalLiters.plus(new BigNumber(record.liters));
        totalCost = totalCost.plus(new BigNumber(record.cost));

        const distance = new BigNumber(record.finalOdometer).minus(new BigNumber(record.initialOdometer));
        totalDistance = totalDistance.plus(distance);

        if (record.efficiency) {
          efficiencySum = efficiencySum.plus(new BigNumber(record.efficiency));
          validEfficiencyCount++;
        }
      });

      const averageEfficiency = validEfficiencyCount > 0
        ? efficiencySum.dividedBy(new BigNumber(validEfficiencyCount))
        : new BigNumber(0);

      periodSummaries.push({
        period,
        totalLiters: totalLiters.toNumber(),
        totalCost: totalCost.toNumber(),
        totalDistance: totalDistance.toNumber(),
        averageEfficiency: averageEfficiency.toNumber()
      });
    }

    // Sort by period (newest first)
    const sortedSummaries = periodSummaries.sort((a, b) => b.period.localeCompare(a.period));

    return FuelConsumptionByPeriodMapper.toDomainAll(sortedSummaries);
  }

}
