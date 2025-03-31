import { IsString } from 'class-validator';

export class CreateExpenseTypeDto {
  @IsString()
  name: string;

  @IsString()
  description: string;
}
