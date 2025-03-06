import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCreditNoteDto {
  @IsString()
  creditNoteNumber: string;

  @IsNumber()
  amount: number;

  @IsString()
  issuanceDate: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
