import { WarehouseEntity }                 from '@modules/inventory/domain/entities/warehouse.entity';
import { PaginationQueryDto }              from '@shared/utils/dto/pagination-query.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryWarehouseDto extends PaginationQueryDto<WarehouseEntity> {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  contactPerson?: string;
}
