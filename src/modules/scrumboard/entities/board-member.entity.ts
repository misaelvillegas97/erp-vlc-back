import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { UserEntity }     from '@modules/users/domain/entities/user.entity';
import { BoardEntity }    from './board.entity';
import { AbstractEntity } from '@shared/domain/entities/abstract.entity';

@Entity('scrumboard_board_member')
export class BoardMemberEntity extends AbstractEntity {
  @ManyToOne(() => BoardEntity, board => board.members, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'boardId'})
  board: BoardEntity;

  @Column()
  boardId: string;

  @ManyToOne(() => UserEntity, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'userId'})
  user: UserEntity;

  @Column()
  userId: string;
}
