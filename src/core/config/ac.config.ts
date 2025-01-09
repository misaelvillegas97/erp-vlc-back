import { registerAs } from '@nestjs/config';

export default registerAs('ac', () => ({
  captchaSolver: process.env.CAPTCHA_SOLVER,
}));
