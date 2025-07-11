import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';

import { CreateListDto }       from '../dtos/create-list.dto';
import { UpdateListDto }       from '../dtos/update-list.dto';
import { ListService }         from '../services/list.service';
import { BoardGateway }        from '../gateways/board.gateway';
import { ResponseListsMapper } from '../mappers/response-lists.mapper';
import { AuthGuard }           from '@nestjs/passport';

@Controller('scrumboard/list')
@UseGuards(AuthGuard('jwt'))
export class ListController {
  constructor(
    private readonly listService: ListService,
    private readonly boardGateway: BoardGateway
  ) {}

  @Post()
  async create(@Body() createListDto: CreateListDto) {
    const list = await this.listService.create(createListDto);

    // Notify clients about the new list
    if (this.boardGateway.server) {
      this.boardGateway.server.to('board_' + createListDto.boardId).emit('listCreated', list);
    }

    return list;
  }

  @Get()
  async findAll() {
    return this.listService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listService.findOne(id);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() updateListDto: UpdateListDto) {
    const result = await this.listService.update(id, updateListDto);
    return ResponseListsMapper.map(result);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateListDto: UpdateListDto) {
    const result = await this.listService.update(id, updateListDto);

    // Notify clients about the updated list
    if (this.boardGateway.server) {
      this.boardGateway.server.to('board_' + result.boardId).emit('listUpdated', result);
    }

    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.listService.remove(id);

    // Notify clients about the deleted list
    if (this.boardGateway.server) {
      this.boardGateway.server.to('board_' + result.list.boardId).emit('listDeleted', result);
    }

    return result;
  }
}
