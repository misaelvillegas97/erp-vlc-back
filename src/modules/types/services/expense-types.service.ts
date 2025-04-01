import { Injectable }           from '@nestjs/common';
import { InjectRepository }     from '@nestjs/typeorm';
import { ExpenseTypesEntity }   from '@modules/types/domain/entities/expense-types.entity';
import { Repository }           from 'typeorm';
import { CreateExpenseTypeDto } from '@modules/types/domain/dtos/create-expense-type.dto';

@Injectable()
export class ExpenseTypesService {
  constructor(
    @InjectRepository(ExpenseTypesEntity) private expensesTypeRepository: Repository<ExpenseTypesEntity>,
  ) {}

  async create(dto: CreateExpenseTypeDto) {
    const expensesType = this.expensesTypeRepository.create(dto);
    return this.expensesTypeRepository.save(expensesType);
  }

  async findAll() {
    return this.expensesTypeRepository.find();
  }

  async findOne(id: string) {
    return this.expensesTypeRepository.findOne({where: {id}});
  }

  async update(id: string, dto: any) {
    await this.expensesTypeRepository.update(id, dto);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.expensesTypeRepository.delete(id);
  }
}
