import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';

import { CreateListDto } from '../dtos/create-list.dto';
import { UpdateListDto } from '../dtos/update-list.dto';
import { ListEntity }    from '../entities/list.entity';
import { BoardEntity }   from '../entities/board.entity';
import { CardEntity }    from '../entities/card.entity';

@Injectable()
export class ListService {
  constructor(
    @InjectRepository(ListEntity)
    private readonly listRepository: Repository<ListEntity>,
    @InjectRepository(BoardEntity)
    private readonly boardRepository: Repository<BoardEntity>,
    @InjectRepository(CardEntity)
    private readonly cardRepository: Repository<CardEntity>,
  ) {}

  async create(createListDto: CreateListDto) {
    // Create the list
    const list = this.listRepository.create({
      title: createListDto.title,
      boardId: createListDto.boardId,
      position: createListDto.position,
    });

    // Save the list
    const savedList = await this.listRepository.save(list);

    // Update the board's lastActivity
    await this.boardRepository.update(createListDto.boardId, {
      lastActivity: new Date()
    });

    return savedList;
  }

  async findAll() {
    return this.listRepository.find();
  }

  async findOne(id: string) {
    const list = await this.listRepository.findOne({
      where: {id},
      relations: [ 'cards', 'cards.assignees', 'cards.labels', 'board' ],
      order: {
        cards: {
          position: 'ASC'
        }
      }
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${ id } not found`);
    }

    return list;
  }

  async update(id: string, updateListDto: UpdateListDto) {
    // Find the list
    const list = await this.findOne(id);

    // Filter out null and undefined values
    const updatedListDto = Object.fromEntries(
      Object.entries(updateListDto).filter(([ , value ]) => value !== null && value !== undefined)
    );

    // Update the list
    await this.listRepository.update(id, updatedListDto);

    // Update the board's lastActivity
    await this.boardRepository.update(list.boardId, {
      lastActivity: new Date()
    });

    // Return the updated list
    return this.findOne(id);
  }

  async remove(id: string) {
    // Find the list
    const list = await this.findOne(id);

    // Delete all cards in the list
    if (list.cards && list.cards.length > 0) {
      await this.cardRepository.remove(list.cards);
    }

    // Delete the list
    await this.listRepository.remove(list);

    return {
      deleted: true,
      list
    };
  }
}
