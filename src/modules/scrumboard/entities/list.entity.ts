import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BoardEntity }    from './board.entity';
import { CardEntity }     from './card.entity';
import { AbstractEntity } from '@shared/domain/entities/abstract.entity';

@Entity('scrumboard_list')
export class ListEntity extends AbstractEntity {
  @ManyToOne(() => BoardEntity, board => board.lists, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'boardId'})
  board: BoardEntity;

  @Column()
  boardId: string;

  @Column()
  position: number;

  @Column()
  title: string;

  @OneToMany(() => CardEntity, card => card.list, {cascade: true})
  cards: CardEntity[];
}
