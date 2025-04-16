import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';
import { VehicleSessionEntity }      from './vehicle-session.entity';

export enum DriverLicenseType {
  A = 'a',
  B = 'b',
  C = 'c',
  D = 'd',
  COMMERCIAL = 'commercial',
  INTERNATIONAL = 'international'
}

@Entity('driver')
export class DriverEntity extends AbstractEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({unique: true})
  documentId: string;

  @Column()
  licenseNumber: string;

  @Column({
    type: 'enum',
    enum: DriverLicenseType,
    default: DriverLicenseType.B
  })
  licenseType: DriverLicenseType;

  @Column()
  licenseValidFrom: Date;

  @Column()
  licenseValidTo: Date;

  @Column({nullable: true})
  phoneNumber: string;

  @Column({nullable: true})
  email: string;

  @Column({nullable: true})
  address: string;

  @Column({nullable: true})
  emergencyContactName: string;

  @Column({nullable: true})
  emergencyContactPhone: string;

  @Column({nullable: true})
  notes: string;

  @Column('simple-json', {nullable: true})
  photo: { id: string, path: string };

  @OneToMany(() => VehicleSessionEntity, session => session.driver)
  sessions: VehicleSessionEntity[];
}
