import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { In, Repository }                from 'typeorm';

import { UserEntity }    from '@modules/users/domain/entities/user.entity';
import { CardEntity }    from '../entities/card.entity';
import { CreateCardDto } from '../dtos/create-card.dto';
import { UpdateCardDto } from '../dtos/update-card.dto';
import { LabelEntity }   from '../entities/label.entity';
import { BoardEntity }   from '../entities/board.entity';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepository: Repository<CardEntity>,
    @InjectRepository(LabelEntity)
    private readonly labelRepository: Repository<LabelEntity>,
    @InjectRepository(BoardEntity)
    private readonly boardRepository: Repository<BoardEntity>
  ) {}

  async create(createCardDto: CreateCardDto, user: UserEntity) {
    // Create the card
    const card = this.cardRepository.create({
      ...createCardDto,
      boardId: createCardDto.boardId,
      listId: createCardDto.listId,
      createdBy: new UserEntity({id: user.id}),
      assignees: createCardDto.assignees?.map(userId => new UserEntity({id: userId})),
      labels: createCardDto.labels?.map(labelId => new LabelEntity({id: labelId})),
    } as Partial<CardEntity>);

    // Save the card
    const savedCard = await this.cardRepository.save(card);

    // Add labels if provided
    if (createCardDto.labels && createCardDto.labels.length > 0) {
      const labels = await this.labelRepository.findBy({id: In(createCardDto.labels)});
      savedCard.labels = labels;
      await this.cardRepository.save(savedCard);
    }

    // Update the board's lastActivity
    await this.boardRepository.update(createCardDto.boardId, {
      lastActivity: new Date()
    });

    return this.findOne(savedCard.id);
  }

  async findAll() {
    return this.cardRepository.find();
  }

  async findOne(id: string) {
    const card = await this.cardRepository.findOne({
      where: {id},
      relations: [ 'board', 'labels', 'assignees', 'createdBy', 'createdBy.roles' ],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${ id } not found`);
    }

    return card;
  }

  async update(id: string, updateCardDto: UpdateCardDto) {
    // Find the card
    const card = await this.findOne(id);

    // Filter out undefined and null fields
    const filteredDto: Partial<UpdateCardDto> = Object.keys(updateCardDto).reduce((acc, key) => {
      if (updateCardDto[key] !== undefined && updateCardDto[key] !== null) {
        acc[key] = updateCardDto[key];
      }
      return acc;
    }, {});

    const {labels, assignees, ...updateFields} = filteredDto;

    // Update basic fields
    if (Object.keys(updateFields).length > 0) {
      await this.cardRepository.update(id, updateFields);
    }

    // Update labels if provided
    if (labels) {
      const newLabels = await this.labelRepository.findBy({id: In(labels)});
      card.labels = newLabels;
      await this.cardRepository.save(card);
    }

    // Update assignees if provided
    if (assignees) {
      card.assignees = assignees.map(userId => ({id: userId} as UserEntity));
      await this.cardRepository.save(card);
    }

    // Update the board's lastActivity
    await this.boardRepository.update(card.boardId, {
      lastActivity: new Date()
    });

    // Return the updated card
    return this.findOne(id);
  }

  async remove(id: string) {
    // Find the card
    const card = await this.findOne(id);

    // Delete the card
    await this.cardRepository.remove(card);

    return {
      deleted: true,
      card
    };
  }
}
