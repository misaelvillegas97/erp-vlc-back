import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AbstractEntity }                       from '@shared/domain/entities/abstract.entity';
import { UserEntity }                           from './user.entity';

export enum DriverLicenseType {
  A = 'a',
  B = 'b',
  C = 'c',
  D = 'd',
  COMMERCIAL = 'commercial',
  INTERNATIONAL = 'international'
}

@Entity('driver_license')
export class DriverLicenseEntity extends AbstractEntity {
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
  restrictions: string;

  @Column({nullable: true})
  issuingAuthority: string;

  @OneToOne(() => UserEntity, user => user.driverLicense)
  @JoinColumn()
  user: UserEntity;

  @Column()
  userId: string;
}
