import { IsIn, IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateTicketDto {
  @IsIn(['erp', 'fleet'])
  source: 'erp' | 'fleet';

  @IsString()
  @Length(4, 200)
  subject: string;

  @IsString()
  @Length(10, 10000)
  description: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsUUID()
  createdBy: string;
}
