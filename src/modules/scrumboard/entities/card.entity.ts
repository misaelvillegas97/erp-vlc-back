import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';

import { UserEntity }     from '@modules/users/domain/entities/user.entity';
import { BoardEntity }    from './board.entity';
import { ListEntity }     from './list.entity';
import { LabelEntity }    from './label.entity';
import { AbstractEntity } from '@shared/domain/entities/abstract.entity';

@Entity('scrumboard_card')
export class CardEntity extends AbstractEntity {
  @ManyToOne(() => BoardEntity, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'boardId'})
  board: BoardEntity;

  @Column()
  boardId: string;

  @ManyToOne(() => ListEntity, list => list.cards, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'listId'})
  list: ListEntity;

  @Column()
  listId: string;

  @Column()
  position: number;

  @Column()
  title: string;

  @Column({nullable: true})
  description?: string;

  @ManyToMany(() => LabelEntity, label => label.cards)
  @JoinTable({
    name: 'scrumboard_card_label',
    joinColumn: {name: 'cardId', referencedColumnName: 'id'},
    inverseJoinColumn: {name: 'labelId', referencedColumnName: 'id'}
  })
  labels: LabelEntity[];

  // One or more responsible users
  @ManyToMany(() => UserEntity)
  @JoinTable({
    name: 'scrumboard_card_assignee',
    joinColumn: {name: 'cardId', referencedColumnName: 'id'},
    inverseJoinColumn: {name: 'userId', referencedColumnName: 'id'}
  })
  assignees: UserEntity[];

  @Column({nullable: true})
  dueDate?: Date;
}
