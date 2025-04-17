import { BaseDto } from './base.dto';

export class FeatureToggleResponseDto extends BaseDto {
  name: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  category?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}