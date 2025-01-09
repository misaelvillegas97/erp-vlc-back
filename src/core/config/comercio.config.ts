import { registerAs } from '@nestjs/config';

export default registerAs('comercio', () => ({
  username: process.env.COMERCIO_USERNAME,
  password: process.env.COMERCIO_PASSWORD,
  url: process.env.COMERCIO_URL,
}));
