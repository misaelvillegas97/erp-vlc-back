import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { LabelEntity }                   from '../entities/label.entity';
import { CreateLabelDto }                from '../dtos/create-label.dto';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(LabelEntity)
    private readonly labelRepository: Repository<LabelEntity>,
  ) {}

  async findAll() {
    return this.labelRepository.find();
  }

  async findOne(id: string) {
    const label = await this.labelRepository.findOne({where: {id}});
    if (!label) {
      throw new NotFoundException(`Label with ID ${ id } not found`);
    }
    return label;
  }

  async create(boardId: string, dto: CreateLabelDto) {
    const label = this.labelRepository.create({
      ...dto,
      boardId
    });

    return this.labelRepository.save(label);
  }

  async remove(id: string) {
    const label = await this.findOne(id);
    await this.labelRepository.remove(label);
    return label;
  }
}
