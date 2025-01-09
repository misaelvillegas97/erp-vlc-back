import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import fileConfig                 from './config/file.config';
import { FileConfig, FileDriver } from './config/file-config.type';
import { FilesService }           from './files.service';
import { FilesLocalModule }       from './infrastructure/uploader/local/files.module';
import { FilesS3Module }          from './infrastructure/uploader/s3/files.module';
import { FilesS3PresignedModule } from './infrastructure/uploader/s3-presigned/files.module';
import { FileEntity }             from '@modules/files/domain/entities/file.entity';
import { FileRepository }         from '@modules/files/domain/repositories/file.repository';

const infrastructureUploaderModule =
  (fileConfig() as FileConfig).driver === FileDriver.LOCAL
    ? FilesLocalModule
    : (fileConfig() as FileConfig).driver === FileDriver.S3
      ? FilesS3Module
      : FilesS3PresignedModule;

@Module({
  imports: [
    TypeOrmModule.forFeature([ FileEntity ]),
    infrastructureUploaderModule
  ],
  providers: [
    FilesService,
    FileRepository
  ],
  exports: [ FilesService, FileRepository ],
})
export class FilesModule {}
