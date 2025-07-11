import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { UserEntity }                    from '@modules/users/domain/entities/user.entity';
import { BoardMemberEntity }             from '../entities/board-member.entity';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(BoardMemberEntity)
    private readonly boardMemberRepository: Repository<BoardMemberEntity>,
  ) {}

  async findAll() {
    return this.userRepository.find();
  }

  async findBoardMembers(boardId: string) {
    const boardMembers = await this.boardMemberRepository.find({
      where: {boardId},
      relations: [ 'user' ]
    });

    return boardMembers.map(member => member.user);
  }

  async findOne(userId: string) {
    const user = await this.userRepository.findOne({
      where: {id: userId}
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${ userId } not found`);
    }

    return user;
  }
}
