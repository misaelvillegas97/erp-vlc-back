import { BaseEntity, CreateDateColumn, DeleteDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { v4 }                                                                              from 'uuid';

export abstract class AbstractEntity extends BaseEntity {
  @PrimaryColumn('uuid')
  id: string = v4();

  @CreateDateColumn({name: 'created_at', type: 'timestamp with time zone'})
  createdAt: Date;

  @UpdateDateColumn({name: 'updated_at', type: 'timestamp with time zone'})
  updatedAt: Date;


  @DeleteDateColumn({name: 'deleted_at', type: 'timestamp with time zone'})
  deletedAt: Date;
}
