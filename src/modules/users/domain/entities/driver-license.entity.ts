import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AbstractEntity }                       from '@shared/domain/entities/abstract.entity';
import { UserEntity }                           from './user.entity';

export enum DriverLicenseType {
  A = 'A',
  A1 = 'A1',
  A2 = 'A2',
  A3 = 'A3',
  A4 = 'A4',
  A5 = 'A5',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  COMMERCIAL = 'commercial',
  INTERNATIONAL = 'international'
}

@Entity('driver_license')
export class DriverLicenseEntity extends AbstractEntity {
  @Column({
    type: 'enum',
    enum: DriverLicenseType,
    default: DriverLicenseType.B,
    name: 'license_type'
  })
  licenseType: DriverLicenseType;

  @Column({name: 'license_valid_from'})
  licenseValidFrom: Date;

  @Column({name: 'license_valid_to'})
  licenseValidTo: Date;

  @Column({nullable: true})
  restrictions: string;

  @Column({nullable: true, name: 'issuing_authority'})
  issuingAuthority: string;

  @OneToOne(() => UserEntity, user => user.driverLicense)
  @JoinColumn({name: 'user_id'})
  user: UserEntity;

  @Column({name: 'user_id'})
  userId: string;
}
