import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { DataSource, Repository }        from 'typeorm';

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
    private readonly boardRepository: Repository<BoardEntity>,
    private readonly dataSource: DataSource
  ) {}

  async create(createCardDto: CreateCardDto, user: UserEntity): Promise<CardEntity> {
    return this.dataSource.transaction(async manager => {
      // Create the card with proper relationships
      const card = this.cardRepository.create({
        ...createCardDto,
        createdById: user.id,
        assignees: createCardDto.assignees?.map(userId => ({id: userId} as UserEntity)),
        labels: createCardDto.labels?.map(labelId => ({id: labelId} as LabelEntity)),
      });

      // Save the card in transaction
      const savedCard = await manager.save(CardEntity, card);

      // Update the board's lastActivity in the same transaction
      await manager.update(BoardEntity, createCardDto.boardId, {
        lastActivity: new Date()
      });

      // Return the created card with relations
      return manager.findOne(CardEntity, {
        where: {id: savedCard.id},
        relations: [ 'board', 'labels', 'assignees', 'createdBy', 'createdBy.roles' ],
      });
    });
  }

  async findAll(): Promise<CardEntity[]> {
    return this.cardRepository.find({
      relations: [ 'board', 'labels', 'assignees', 'createdBy' ],
    });
  }

  async findOne(id: string): Promise<CardEntity> {
    const card = await this.cardRepository.findOne({
      where: {id},
      relations: [ 'board', 'labels', 'assignees', 'createdBy', 'createdBy.roles' ],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${ id } not found`);
    }

    return card;
  }

  async update(id: string, updateCardDto: UpdateCardDto): Promise<CardEntity> {
    return this.dataSource.transaction(async manager => {
      // Find the card first to get boardId
      const existingCard = await manager.findOne(CardEntity, {
        where: {id},
        select: [ 'id', 'boardId' ]
      });

      if (!existingCard) {
        throw new NotFoundException(`Card with ID ${ id } not found`);
      }

      // Filter out undefined and null fields
      const filteredDto: Partial<UpdateCardDto> = Object.keys(updateCardDto).reduce((acc, key) => {
        if (updateCardDto[key] !== undefined && updateCardDto[key] !== null) {
          acc[key] = updateCardDto[key];
        }
        return acc;
      }, {});

      const {labels, assignees, ...updateFields} = filteredDto;

      // Update scalar fields only (no relationships) using update for performance
      if (Object.keys(updateFields).length > 0) {
        await manager.update(CardEntity, id, updateFields);
      }

      // Update many-to-many relationships if provided
      if (labels !== undefined || assignees !== undefined) {
        // Get the current card entity with relationships for updating
        const cardEntity = await manager.findOne(CardEntity, {
          where: {id},
          relations: [ 'labels', 'assignees' ]
        });

        if (!cardEntity) {
          throw new NotFoundException(`Card with ID ${ id } not found`);
        }

        // Update relationships if provided
        if (labels !== undefined) {
          cardEntity.labels = labels.map(labelId => ({id: labelId} as LabelEntity));
        }

        if (assignees !== undefined) {
          cardEntity.assignees = assignees.map(userId => ({id: userId} as UserEntity));
        }

        // Save the entity with updated relationships
        await manager.save(CardEntity, cardEntity);
      }

      // Update the board's lastActivity in the same transaction
      await manager.update(BoardEntity, existingCard.boardId, {
        lastActivity: new Date()
      });

      // Return the updated card with relations
      return manager.findOne(CardEntity, {
        where: {id},
        relations: [ 'board', 'labels', 'assignees', 'createdBy', 'createdBy.roles' ],
      });
    });
  }

  async remove(id: string): Promise<{ deleted: boolean; card: CardEntity }> {
    return this.dataSource.transaction(async manager => {
      // Find the card with minimal relations for return value
      const card = await manager.findOne(CardEntity, {
        where: {id},
        relations: [ 'board', 'labels', 'assignees', 'createdBy' ],
      });

      if (!card) {
        throw new NotFoundException(`Card with ID ${ id } not found`);
      }

      // Delete the card
      await manager.remove(CardEntity, card);

      return {
        deleted: true,
        card,
      };
    });
  }
}
