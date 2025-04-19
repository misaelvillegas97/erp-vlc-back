import { BaseDto } from './base.dto';

export class FeatureToggleResponseDto extends BaseDto {
  name: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  category?: string;
  metadata?: Record<string, any>;
  parentId?: string;
  parent?: FeatureToggleResponseDto;
  children?: FeatureToggleResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}