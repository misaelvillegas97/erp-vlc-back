import { CardEntity }          from '@modules/scrumboard/entities/card.entity';
import { ResponseLabelMapper } from '@modules/scrumboard/mappers/response-label.mapper';
import { UserMapper }          from '@modules/users/domain/mappers/user.mapper';
import { User }                from '@modules/users/domain/user';

export class ResponseCardMapper {
  public id: string;
  public boardId: string;
  public listId: string;
  public position: number;
  public title: string;
  public description?: string | null;
  public labels?: ResponseLabelMapper[];
  public assignees?: User[];
  public dueDate?: Date;
  public owner: User;

  constructor(values: ResponseCardMapper) {
    Object.assign(this, values);
  }

  static map(card: CardEntity): ResponseCardMapper {
    return new ResponseCardMapper({
      id: card.id,
      boardId: card.boardId,
      listId: card.listId,
      position: card.position,
      title: card.title,
      description: card.description,
      labels: card.labels && ResponseLabelMapper.mapAll(card.labels),
      assignees: card.assignees && card.assignees.map(UserMapper.toDomain),
      dueDate: card.dueDate,
      owner: UserMapper.toDomain(card.createdBy)
    });
  }
}
