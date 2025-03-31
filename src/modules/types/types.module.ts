import { Module }                from '@nestjs/common';
import { TypeOrmModule }         from '@nestjs/typeorm';
import { ExpenseTypeEntity }     from '@modules/types/domain/entities/expense-type.entity';
import { ExpenseTypeService }    from '@modules/types/services/expense-type.service';
import { ExpenseTypeController } from '@modules/types/controllers/expense-type.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ ExpenseTypeEntity ])
  ],
  controllers: [ ExpenseTypeController ],
  providers: [ ExpenseTypeService ],
  exports: []
})
export class TypesModule {}
