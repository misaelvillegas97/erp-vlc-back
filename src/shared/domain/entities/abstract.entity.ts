import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { v4 }                                                                                                             from 'uuid';
import { UserEntity }                                                                                                     from '@modules/users/domain/entities/user.entity';

export abstract class AbstractEntity extends BaseEntity {
  @PrimaryColumn('uuid')
  id: string = v4();

  @Column({name: 'created_by', type: 'uuid', nullable: true})
  createdById: string;

  @Column({name: 'deleted_by', type: 'uuid', nullable: true})
  deletedById: string;

  @CreateDateColumn({name: 'created_at', type: 'timestamp with time zone'})
  createdAt: Date;

  @UpdateDateColumn({name: 'updated_at', type: 'timestamp with time zone'})
  updatedAt: Date;

  @DeleteDateColumn({name: 'deleted_at', type: 'timestamp with time zone'})
  deletedAt: Date;

  // Audit fields
  @ManyToOne(() => UserEntity, (user) => user.roles)
  @JoinColumn({name: 'created_by'})
  createdBy: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.roles)
  @JoinColumn({name: 'deleted_by'})
  deletedBy: UserEntity;
}
