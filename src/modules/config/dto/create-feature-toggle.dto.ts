import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFeatureToggleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsObject()
  @IsOptional()
  requiredMetadata?: {
    name: string;
    description: string;
    type: string;
  }[];

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
