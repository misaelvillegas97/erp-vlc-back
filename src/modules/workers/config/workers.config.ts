import { registerAs } from '@nestjs/config';

import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkersConfig }                         from './workers-config.type';
import validateConfig                            from '@shared/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  WORKER_HOST: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  WORKER_PORT: number;
}

export default registerAs<WorkersConfig>('workers', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    host: process.env.WORKER_HOST || 'localhost',
    port: process.env.WORKER_PORT
      ? parseInt(process.env.WORKER_PORT, 10)
      : 6379,
  };
});
