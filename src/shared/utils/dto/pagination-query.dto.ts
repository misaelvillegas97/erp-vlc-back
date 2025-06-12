import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional }                 from '@nestjs/swagger';
import { Type }                                from 'class-transformer';

export class PaginationQueryDto<T> {
  @ApiPropertyOptional({description: 'Page number for pagination', default: 1})
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({description: 'Limit of records per page', default: 10})
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: keyof T;

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}
