import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExpenseTypesService }         from '@modules/types/services/expense-types.service';
import { CreateExpenseTypeDto }        from '@modules/types/domain/dtos/create-expense-type.dto';

@Controller('expense-types')
export class ExpenseTypesController {
  constructor(private readonly expenseTypesService: ExpenseTypesService) {}

  @Get()
  findAll() {
    return this.expenseTypesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateExpenseTypeDto) {
    return this.expenseTypesService.create(dto);
  }


}
