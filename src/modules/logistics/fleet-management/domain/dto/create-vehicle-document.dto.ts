import { ApiProperty, ApiPropertyOptional }         from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FileDto }                                  from '@modules/files/dto/file.dto';
import { DocumentType }                             from '../entities/vehicle-document.entity';

export class CreateVehicleDocumentDto {
  @ApiProperty({enum: DocumentType, description: 'Type of document'})
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @ApiProperty({description: 'Name of the document'})
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({description: 'Expiry date of the document (if applicable)'})
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({description: 'Additional notes about the document'})
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({type: () => FileDto, description: 'File information'})
  @IsNotEmpty()
  file: FileDto;
}
