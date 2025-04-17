import { OmitType, PartialType }  from '@nestjs/swagger';
import { CreateFeatureToggleDto } from './create-feature-toggle.dto';

export class UpdateFeatureToggleDto extends PartialType(
  OmitType(CreateFeatureToggleDto, [] as const),
) {}
