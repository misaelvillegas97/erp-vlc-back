import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';

import { BoardEntity }    from './board.entity';
import { CardEntity }     from './card.entity';
import { AbstractEntity } from '@shared/domain/entities/abstract.entity';

@Entity('scrumboard_label')
export class LabelEntity extends AbstractEntity {
  @ManyToOne(() => BoardEntity, board => board.labels, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'boardId'})
  board: BoardEntity;

  @Column()
  boardId: string;

  @Column()
  title: string;

  @Column({nullable: true})
  color: string;

  @ManyToMany(() => CardEntity, card => card.labels)
  cards: CardEntity[];

  constructor(values: Partial<LabelEntity>) {
    super();
    Object.assign(this, values);
  }
}
