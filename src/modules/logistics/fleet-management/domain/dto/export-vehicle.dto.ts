import { ApiProperty }        from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
}

export class ExportVehicleDto {
  @ApiProperty({
    enum: ExportFormat,
    default: ExportFormat.EXCEL,
    description: 'Format for the exported file',
  })
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.EXCEL;
}
