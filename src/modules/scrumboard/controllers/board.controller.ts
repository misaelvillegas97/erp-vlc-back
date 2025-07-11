import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CreateBoardDto }       from '../dtos/create-board.dto';
import { UpdateBoardDto }       from '../dtos/update-board.dto';
import { BoardService }         from '../services/board.service';
import { LabelService }         from '../services/label.service';
import { CreateLabelDto }       from '../dtos/create-label.dto';
import { UsersService }         from '@modules/users/users.service';
import { ResponseBoardMapper }  from '../mappers/response-board.mapper';
import { ResponseBoardsMapper } from '../mappers/response-boards.mapper';
import { AuthGuard }            from '@nestjs/passport';
import { CurrentUser }          from '@shared/decorators/current-user.decorator';
import { UserRequest }          from '@modules/users/domain/models/user-request';
import { ResponseLabelMapper }  from '@modules/scrumboard/mappers/response-label.mapper';

@Controller('scrumboard/board')
@UseGuards(AuthGuard('jwt'))
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly labelService: LabelService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  async create(
    @Body() createBoardDto: CreateBoardDto,
    @CurrentUser() user: UserRequest
  ) {
    const result = await this.boardService.create(createBoardDto, user);

    return ResponseBoardMapper.map(result);
  }

  @Get()
  async findAll(@CurrentUser() user: UserRequest) {
    const boards = await this.boardService.findAll(user.id);
    return boards.map(ResponseBoardsMapper.map);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const board = await this.boardService.findOne(id);
    return ResponseBoardMapper.map(board);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto) {
    const updatedBoard = await this.boardService.update(id, updateBoardDto);
    return ResponseBoardMapper.map(updatedBoard);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boardService.remove(id);
  }

  @Post(':boardId/members')
  async addMember(
    @Param('boardId') boardId: string,
    @Body('userId') userId: string
  ) {
    // Check if board exists
    const board = await this.boardService.findOne(boardId);

    // Check if user exists
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Create a new board member
    const boardMemberRepository = this.boardService['boardMemberRepository'];
    const boardMember = boardMemberRepository.create({
      boardId,
      userId
    });
    await boardMemberRepository.save(boardMember);

    // Return updated board
    const updatedBoard = await this.boardService.findOne(boardId);
    return ResponseBoardMapper.map(updatedBoard);
  }

  @Delete(':boardId/members/:userId')
  async removeMember(
    @Param('boardId') boardId: string,
    @Param('userId') userId: string
  ) {
    // Check if board exists
    const board = await this.boardService.findOne(boardId);

    // Delete the board member
    const boardMemberRepository = this.boardService['boardMemberRepository'];
    await boardMemberRepository.delete({boardId, userId});

    // Return updated board
    const updatedBoard = await this.boardService.findOne(boardId);
    return ResponseBoardMapper.map(updatedBoard);
  }

  @Post(':boardId/labels')
  async addLabel(
    @Param('boardId') boardId: string,
    @Body() createLabelDto: CreateLabelDto
  ) {
    // Check if board exists
    const label = await this.labelService.create(boardId, createLabelDto);
    return ResponseLabelMapper.map(label);
  }

  @Delete(':boardId/labels/:labelId')
  async removeLabel(
    @Param('boardId') boardId: string,
    @Param('labelId') labelId: string
  ) {
    // Check if board exists
    const board = await this.boardService.findOne(boardId);

    // Check if label exists
    const label = await this.labelService.findOne(labelId);
    if (!label) throw new NotFoundException('Label not found');

    await this.labelService.remove(labelId);
    return {
      deleted: true,
      label
    };
  }
}
