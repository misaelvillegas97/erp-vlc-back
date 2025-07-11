import { UserMapper }        from '@modules/users/domain/mappers/user.mapper';
import { BoardMemberEntity } from '@modules/scrumboard/entities/board-member.entity';

export class ResponseMemberMapper {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string;
  readonly position: string;

  constructor(values: ResponseMemberMapper) {
    Object.assign(this, values);
  }

  static map(boardMember: BoardMemberEntity): ResponseMemberMapper {
    const mapped = UserMapper.toDomain(boardMember.user);

    return new ResponseMemberMapper({
      id: mapped.id,
      name: mapped.name,
      avatar: mapped.photo?.path,
      position: mapped.role?.name
    });
  }

  static mapAll(boardMembers: BoardMemberEntity[]): ResponseMemberMapper[] {
    return boardMembers.map(ResponseMemberMapper.map);
  }
}
