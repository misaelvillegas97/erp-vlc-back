import { Injectable } from '@nestjs/common';

import { FileRepository } from '@modules/files/domain/repositories/file.repository';
import { NullableType }   from '@shared/utils/types/nullable.type';
import { FileType }       from './domain/file';

@Injectable()
export class FilesService {
  constructor(private readonly fileRepository: FileRepository) {}

  findById(id: FileType['id']): Promise<NullableType<FileType>> {
    return this.fileRepository.findById(id);
  }
}
