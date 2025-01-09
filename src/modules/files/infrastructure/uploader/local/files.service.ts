import { forwardRef, HttpStatus, Inject, Injectable, UnprocessableEntityException, } from '@nestjs/common';
import { ConfigService }                                                             from '@nestjs/config';

import { AllConfigType }  from '@core/config/config.type';
import { FileRepository } from '@modules/files/domain/repositories/file.repository';
import { FileType }       from '../../../domain/file';

@Injectable()
export class FilesLocalService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(forwardRef(() => FileRepository)) private readonly fileRepository: FileRepository,
  ) {}

  async create(file: Express.Multer.File): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    return {
      file: await this.fileRepository.create({
        path: `/${ this.configService.get('app.apiPrefix', {
          infer: true,
        }) }/v1/${ file.path }`,
      } as FileType),
    };
  }
}
