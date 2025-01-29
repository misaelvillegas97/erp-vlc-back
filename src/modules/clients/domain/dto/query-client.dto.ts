import { IsOptional } from 'class-validator';

export class QueryClientDto {
  @IsOptional()
  readonly fantasyName?: string;
}
