import { registerAs } from '@nestjs/config';
import { IProvider }  from './interfaces/provider.interface';

export default registerAs(
  'cencosud',
  (): IProvider => ({
    username: process.env.CENCOSUD_B2B_USERNAME || 'cencosud',
    password: process.env.CENCOSUD_B2B_PASSWORD || 'cencosud',
    url: process.env.CENCOSUD_B2B_URL || 'https://b2b.cencosud.com'
  }),
);
