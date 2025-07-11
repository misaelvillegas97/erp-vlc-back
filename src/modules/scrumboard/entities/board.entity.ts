import { Column, Entity, OneToMany } from 'typeorm';
import { LabelEntity }               from './label.entity';
import { ListEntity }                from './list.entity';
import { BoardMemberEntity }         from './board-member.entity';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';

@Entity('scrumboard_board')
export class BoardEntity extends AbstractEntity {
  @Column()
  title: string;

  @Column({type: 'text', nullable: true})
  description?: string;

  @Column({nullable: true})
  icon?: string;

  @Column({nullable: true})
  lastActivity?: Date;

  @OneToMany(() => ListEntity, list => list.board, {cascade: true})
  lists: ListEntity[];

  @OneToMany(() => LabelEntity, label => label.board, {cascade: true})
  labels: LabelEntity[];

  @OneToMany(() => BoardMemberEntity, member => member.board, {cascade: true})
  members: BoardMemberEntity[];
}

0;
