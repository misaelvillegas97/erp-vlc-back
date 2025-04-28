import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AbstractEntity }                                         from '@shared/domain/entities/abstract.entity';
import { VehicleSessionEntity }                                   from './vehicle-session.entity';
import { GpsEntity }                                              from '@modules/logistics/domain/entities/gps.entity';

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',     // Disponible para uso
  IN_USE = 'IN_USE',           // Actualmente en uso
  MAINTENANCE = 'MAINTENANCE', // En mantenimiento
  REPAIR = 'REPAIR',           // En reparación
  OUT_OF_SERVICE = 'OUT_OF_SERVICE', // Fuera de servicio
  RESERVED = 'RESERVED'        // Reservado
}

export enum VehicleType {
  SEDAN = 'SEDAN',
  HATCHBACK = 'HATCHBACK',
  SUV = 'SUV',
  PICKUP = 'PICKUP',
  VAN = 'VAN',
  TRUCK = 'TRUCK',
  BUS = 'BUS',
  MOTORCYCLE = 'MOTORCYCLE',
  OTHER = 'OTHER'
}

export enum FuelType {
  GASOLINE = 'GASOLINE',
  DIESEL = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID',
  LPG = 'LPG',
  CNG = 'CNG',
  OTHER = 'OTHER'
}

@Entity('vehicle')
export class VehicleEntity extends AbstractEntity {
  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({name: 'license_plate'})
  @Index({unique: true})
  licensePlate: string;

  @Column({nullable: true})
  @Index({unique: true})
  vin: string;

  @Column({
    type: 'enum',
    enum: VehicleType,
    default: VehicleType.SEDAN
  })
  type: VehicleType;

  @Column({nullable: true})
  color: string;

  @Column({
    name: 'fuel_type',
    type: 'enum',
    enum: FuelType,
    default: FuelType.GASOLINE
  })
  fuelType: FuelType;

  @Column({
    name: 'tank_capacity',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true
  })
  tankCapacity: number;

  @Column({type: 'float', name: 'current_odometer'})
  lastKnownOdometer: number;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE
  })
  @Index()
  status: VehicleStatus;

  @Column({name: 'current_session_id', nullable: true})
  currentSessionId: string;

  @OneToOne(() => VehicleSessionEntity, {nullable: true})
  @JoinColumn({name: 'current_session_id'})
  currentSession: VehicleSessionEntity;

  @Column({name: 'department_id', nullable: true})
  departmentId: string;

  @Column({type: 'date', nullable: true, name: 'last_maintenance_date'})
  lastMaintenanceDate: string;

  @Column({type: 'date', nullable: true, name: 'next_maintenance_date'})
  nextMaintenanceDate: string;

  @Column({nullable: true, name: 'next_maintenance_km'})
  nextMaintenanceKm: number;

  @Column({type: 'date', nullable: true, name: 'purchase_date'})
  purchaseDate: string;

  @Column({type: 'date', nullable: true, name: 'insurance_expiry'})
  insuranceExpiry: string;

  @Column({type: 'date', nullable: true, name: 'technical_inspection_expiry'})
  technicalInspectionExpiry: string;

  @Column({nullable: true, type: 'text'})
  notes: string;

  @OneToMany(() => VehicleSessionEntity, session => session.vehicle)
  sessions: VehicleSessionEntity[];

  @OneToMany(() => GpsEntity, gps => gps.vehicle)
  gps: GpsEntity[];

  @Column('simple-json', {nullable: true, name: 'photo_url'})
  photoUrl: string;

  @Column('simple-json', {nullable: true, name: 'additional_photo_urls'})
  additionalPhotoUrls: string[];
}
