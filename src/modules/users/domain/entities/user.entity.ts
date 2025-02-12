import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
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

  @AfterLoad()
  public loadPreviousPassword(): void {
    this.previousPassword = this.password;
  }

  constructor(values?: Partial<UserEntity>) {
    super();
    Object.assign(this, values);
  }
}
