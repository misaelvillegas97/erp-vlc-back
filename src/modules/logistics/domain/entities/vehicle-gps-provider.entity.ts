import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { GPSProviderEnum }                       from '@modules/gps/domain/enums/provider.enum';
import { VehicleEntity }                         from '@modules/logistics/domain/entities/vehicle.entity';

@Entity({name: 'vehicle_gps_provider'})
export class VehicleGpsProviderEntity extends AbstractEntity {
  @Column({nullable: false, name: 'provider_id'})
  providerId: string;

  @Column({nullable: false, name: 'vehicle_id'})
  vehicleId: string;

  @Column({
    type: 'enum',
    enum: GPSProviderEnum
  })
  provider: GPSProviderEnum;

  @ManyToOne(() => VehicleEntity, {nullable: false})
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;
}
