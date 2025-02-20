import { Controller, Get, Req } from '@nestjs/common';
import { readdir }              from 'fs/promises';
import { join }                 from 'path';
import { Request }              from 'express';

@Controller()
export class AppController {

  @Get()
  async listScreenshots(@Req() req: Request) {
    const directoryPath = join(__dirname, '..', 'public');
    const files = await readdir(directoryPath);
    const screenshots = files.filter(file => file.startsWith('login-failed'));

    // Construir la URL base: por ejemplo, http://localhost:3000/public/
    const baseUrl = `${ req.protocol }://${ req.get('host') }/public/`;

    // Devolver un objeto por cada archivo con nombre y URL
    return screenshots.map(file => ({
      file,
      url: baseUrl + file,
    }));
  }
}
