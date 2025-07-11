import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';

import { BoardEntity }       from '../entities/board.entity';
import { ListEntity }        from '../entities/list.entity';
import { CreateBoardDto }    from '../dtos/create-board.dto';
import { UserEntity }        from '@modules/users/domain/entities/user.entity';
import { BoardMemberEntity } from '../entities/board-member.entity';
import { UserRequest }       from '@modules/users/domain/models/user-request';

// Define a constant for the steps between list positions
const SCRUMBOARD_STEPS = 1000;

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(BoardEntity)
    private readonly boardRepository: Repository<BoardEntity>,
    @InjectRepository(ListEntity)
    private readonly listRepository: Repository<ListEntity>,
    @InjectRepository(BoardMemberEntity)
    private readonly boardMemberRepository: Repository<BoardMemberEntity>,
  ) {}

  async create(createBoardDto: CreateBoardDto, user: UserRequest) {
    // Create the board
    const board = this.boardRepository.create({
      ...createBoardDto,
      lastActivity: new Date(),
      createdBy: new UserEntity({id: user.id}),
      members: [],
    } as Partial<BoardEntity>);

    // Save the board to get an ID
    const savedBoard = await this.boardRepository.save(board);

    // Create default lists
    const lists: Partial<ListEntity>[] = [
      {title: 'To Do', position: SCRUMBOARD_STEPS, boardId: savedBoard.id},
      {title: 'In Progress', position: SCRUMBOARD_STEPS * 2, boardId: savedBoard.id},
      {title: 'Done', position: SCRUMBOARD_STEPS * 3, boardId: savedBoard.id},
      {title: 'Blocked', position: SCRUMBOARD_STEPS * 4, boardId: savedBoard.id}
    ];

    await this.listRepository.save(lists.map(list => this.listRepository.create(list)));

    // Add the creator as a member
    const ownerMember = this.boardMemberRepository.create({
      boardId: savedBoard.id,
      userId: user.id
    });
    await this.boardMemberRepository.save(ownerMember);

    // Add other members if specified
    if (createBoardDto.members && createBoardDto.members.length > 0) {
      const members = createBoardDto.members.map(memberId =>
        this.boardMemberRepository.create({
          boardId: savedBoard.id,
          userId: memberId
        })
      );
      await this.boardMemberRepository.save(members);
    }

    return this.findOne(savedBoard.id);
  }

  async findAll(userId: string) {
    return this.boardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where('members.userId = :userId', {userId})
      .orderBy('board.lastActivity', 'DESC')
      .getMany();
  }

  async findOne(id: string) {
    const board = await this.boardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('user.role', 'userRole')
      .leftJoinAndSelect('board.labels', 'labels')
      .leftJoinAndSelect('board.lists', 'lists')
      .leftJoinAndSelect('lists.cards', 'cards')
      .leftJoinAndSelect('cards.labels', 'cardLabels')
      .leftJoinAndSelect('cards.assignees', 'assignees')
      .leftJoinAndSelect('cards.createdBy', 'createdBy')
      .where('board.id = :id', {id})
      .orderBy('lists.position', 'ASC')
      .addOrderBy('cards.position', 'ASC')
      .getOne();

    if (!board) throw new NotFoundException(`Board with ID ${ id } not found`);

    return board;
  }

  async update(id: string, updateData: Partial<BoardEntity>) {
    await this.boardRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    const result = await this.boardRepository.delete(id);
    return {deleted: result.affected > 0};
  }
}
