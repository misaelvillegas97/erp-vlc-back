import { registerAs } from '@nestjs/config';
import { IsString, IsUrl } from 'class-validator';
import validateConfig from '@shared/utils/validate-config';
import { WhatsappConfig } from './whatsapp-config.type';

class EnvironmentVariablesValidator {
  @IsUrl()
  WHATSAPP_API_URL: string;

  @IsString()
  WHATSAPP_TOKEN: string;

  @IsString()
  WHATSAPP_PHONE_ID: string;
}

export default registerAs<WhatsappConfig>('whatsapp', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    apiUrl: process.env.WHATSAPP_API_URL,
    token: process.env.WHATSAPP_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_ID,
  };
});
