import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
}                       from 'typeorm';
import { RoleEntity }   from '@modules/roles/domain/entities/role.entity';
import { StatusEntity } from '@modules/statuses/domain/entities/status.entity';
import { FileEntity }   from '@modules/files/domain/entities/file.entity';

import { Exclude, Expose }        from 'class-transformer';
import { ApiProperty }            from '@nestjs/swagger';
import { v4 }                     from 'uuid';
import { EntityRelationalHelper } from '@shared/utils/relational-entity-helper';
import { AuthProvidersEnum }      from '@core/auth/auth-providers.enum';
import { RoleUserEntity }         from '@modules/roles/domain/entities/role-user.entity';
import { DriverLicenseEntity }    from './driver-license.entity';
import { VehicleSessionEntity }   from '@modules/logistics/domain/entities/vehicle-session.entity';

@Entity('user')
export class UserEntity extends EntityRelationalHelper {
  @ApiProperty({type: Number,})
  @PrimaryColumn()
  id: string = v4();

  @ApiProperty({type: String, example: 'john.doe@example.com',})
  @Column({type: String, unique: true, nullable: true})
  @Expose({groups: [ 'me', 'admin' ]})
  email: string | null;

  @Column({nullable: true})
  @Exclude({toPlainOnly: true})
  password?: string;

  @Exclude({toPlainOnly: true})
  public previousPassword?: string;

  @ApiProperty({type: String, example: 'email',})
  @Column({default: AuthProvidersEnum.email})
  @Expose({groups: [ 'me', 'admin' ]})
  provider: string;

  @ApiProperty({type: String, example: '1234567890',})
  @Index()
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin' ]})
  socialId?: string | null;

  @ApiProperty({type: String, example: 'John',})
  @Index()
  @Column({type: String, nullable: true})
  firstName: string | null;

  @ApiProperty({type: String, example: 'Doe',})
  @Index()
  @Column({type: String, nullable: true})
  lastName: string | null;

  @ApiProperty({type: () => FileEntity,})
  @OneToOne(() => FileEntity, {eager: true,})
  @JoinColumn()
  photo?: FileEntity | null;

  @ApiProperty({type: () => RoleEntity,})
  @ManyToOne(() => RoleEntity, {eager: true,})
  role?: RoleEntity | null;

  @OneToMany(() => RoleUserEntity, role => role.user)
  roles?: RoleUserEntity[];

  @ApiProperty({type: () => StatusEntity,})
  @ManyToOne(() => StatusEntity, {eager: true,})
  status?: StatusEntity;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty()
  @DeleteDateColumn()
  deletedAt: Date;

  @ApiProperty({type: String, required: false})
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin' ]})
  documentId?: string | null;

  @ApiProperty({type: String, required: false})
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin' ]})
  phoneNumber?: string | null;

  @ApiProperty({type: String, required: false})
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin', 'driver' ]})
  address?: string | null;

  @ApiProperty({type: String, required: false})
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin', 'driver' ]})
  emergencyContactName?: string | null;

  @ApiProperty({type: String, required: false})
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin', 'driver' ]})
  emergencyContactPhone?: string | null;

  @ApiProperty({type: String, required: false})
  @Column({type: String, nullable: true})
  @Expose({groups: [ 'me', 'admin' ]})
  notes?: string | null;

  @ApiProperty({type: () => DriverLicenseEntity, required: false})
  @OneToOne(() => DriverLicenseEntity, driverLicense => driverLicense.user, {
    nullable: true,
    cascade: true,
    eager: true
  })
  driverLicense?: DriverLicenseEntity | null;

  @OneToMany(() => VehicleSessionEntity, session => session.driver)
  vehicleSessions?: VehicleSessionEntity[];

  @AfterLoad()
  public loadPreviousPassword(): void {
    this.previousPassword = this.password;
  }

  /**
   * Verifica si el usuario tiene el rol de conductor
   */
  public isDriver(): boolean {
    if (!this.roles || this.roles.length === 0) return false;
    return this.roles.some(role => role.role?.name === 'driver');
  }

  /**
   * Verifica si el usuario tiene una licencia de conducir válida
   */
  public hasValidDriverLicense(): boolean {
    if (!this.driverLicense) return false;
    const now = new Date();
    return now >= this.driverLicense.licenseValidFrom && now <= this.driverLicense.licenseValidTo;
  }

  constructor(values?: Partial<UserEntity>) {
    super();
    Object.assign(this, values);
  }
}
