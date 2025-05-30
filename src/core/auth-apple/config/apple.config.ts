import { registerAs } from '@nestjs/config';

import { IsJSON, IsOptional } from 'class-validator';
import { AppleConfig }        from './apple-config.type';
import validateConfig         from '@shared/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsJSON()
  @IsOptional()
  APPLE_APP_AUDIENCE: string;
}

export default registerAs<AppleConfig>('apple', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    appAudience: JSON.parse(process.env.APPLE_APP_AUDIENCE ?? '[]'),
  };
});
