import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                         from '../../../fleet-management/domain/entities/vehicle.entity';
import { UserEntity }                            from '@modules/users/domain/entities/user.entity';
import { FuelTypeEnum }                          from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';
import { BigNumber }                             from 'bignumber.js';

/**
 * Enum for gas station brands
 */
export enum GasStationBrand {
  COPEC = 'COPEC',
  ARAMCO = 'ARAMCO',
  SHELL = 'SHELL',
  YPF = 'YPF',
  TERPEL = 'TERPEL',
  OTHER = 'OTHER'
}

/**
 * Entity for fuel records
 * Tracks fuel consumption for vehicles
 */
@Entity('fuel_record')
export class FuelRecordEntity extends AbstractEntity {
  @Column({name: 'vehicle_id'})
  vehicleId: string;

  @ManyToOne(() => VehicleEntity, vehicle => vehicle.fuelRecords)
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @Column({name: 'user_id'})
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({name: 'user_id'})
  user: UserEntity;

  @Column({type: 'date'})
  date: string;

  @Column({name: 'initial_odometer', type: 'float'})
  initialOdometer: number;

  @Column({name: 'final_odometer', type: 'float'})
  finalOdometer: number;

  @Column({type: 'float'})
  liters: number;

  @Column({type: 'float'})
  cost: number;

  @Column({type: 'float', nullable: true})
  efficiency: number;

  @Column({name: 'cost_per_km', type: 'float', nullable: true})
  costPerKm: number;

  @Column({
    name: 'gas_station',
    type: 'enum',
    enum: GasStationBrand,
    nullable: true
  })
  gasStation: GasStationBrand;

  @Column({
    name: 'fuel_type',
    type: 'enum',
    enum: FuelTypeEnum,
    nullable: true
  })
  fuelType: FuelTypeEnum;

  @Column({type: 'text', nullable: true})
  notes: string;

  /**
   * Calculate efficiency and cost per km
   */
  calculateMetrics(): void {
    const distance = this.finalOdometer - this.initialOdometer;

    if (distance > 0 && this.liters > 0) {
      this.efficiency = parseFloat(new BigNumber(distance).dividedBy(this.liters).toFixed(2));
      this.costPerKm = parseFloat(new BigNumber(this.cost).dividedBy(distance).toFixed(2));
    }
  }
}
