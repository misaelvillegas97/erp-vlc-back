import { Module }                 from '@nestjs/common';
import { TypeOrmModule }          from '@nestjs/typeorm';
import { ExpenseTypesEntity }     from '@modules/types/domain/entities/expense-types.entity';
import { ExpenseTypesService }    from '@modules/types/services/expense-types.service';
import { ExpenseTypesController } from '@modules/types/controllers/expense-types.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ ExpenseTypesEntity ])
  ],
  controllers: [ ExpenseTypesController ],
  providers: [ ExpenseTypesService ],
  exports: []
})
export class TypesModule {}
