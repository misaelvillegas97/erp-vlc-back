import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExpenseTypeService }          from '@modules/types/services/expense-type.service';
import { CreateExpenseTypeDto }        from '@modules/types/domain/dtos/create-expense-type.dto';

@Controller('expense-type')
export class ExpenseTypeController {
  constructor(private readonly expenseTypeService: ExpenseTypeService) {}

  @Get()
  findAll() {
    return this.expenseTypeService.findAll();
  }

  @Post()
  create(@Body() dto: CreateExpenseTypeDto) {
    return this.expenseTypeService.create(dto);
  }


}
