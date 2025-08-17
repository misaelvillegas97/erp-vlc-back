import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsIn(['bug', 'consulta', 'feature', 'incidencia'])
  type?: any;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'done', 'canceled'])
  status?: any;

  @IsOptional()
  @IsString()
  suggestedReply?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsIn(['alta', 'media', 'baja'])
  priority?: any;
}
