import { LabelEntity } from '@modules/scrumboard/entities/label.entity';

export class ResponseLabelMapper {
  public id: string;
  public title: string;
  public color?: string;
  public boardId: string;

  constructor(values: ResponseLabelMapper) {
    Object.assign(this, values);
  }

  static map(label: LabelEntity): ResponseLabelMapper {
    return new ResponseLabelMapper({
      id: label.id,
      title: label.title,
      color: label.color,
      boardId: label.boardId,
    });
  }

  static mapAll(labels: LabelEntity[]): ResponseLabelMapper[] {
    return labels.map(ResponseLabelMapper.map);
  }
}
