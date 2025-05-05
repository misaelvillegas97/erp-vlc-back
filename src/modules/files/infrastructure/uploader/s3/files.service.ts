import { HttpStatus, Injectable, Logger, UnprocessableEntityException, } from '@nestjs/common';

import { FileRepository }                from '@modules/files/domain/repositories/file.repository';
import { FileType }                      from '../../../domain/file';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fileConfig                        from '@modules/files/config/file.config';
import { FileConfig }                    from '@modules/files/config/file-config.type';

@Injectable()
export class FilesS3Service {
  private readonly logger = new Logger(FilesS3Service.name);

  constructor(private readonly fileRepository: FileRepository) {}

  async create(file: Express.MulterS3.File): Promise<{ file: FileType }> {
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
        path: file.key,
      } as FileType),
    };
  }

  async delete(id: string) {
    const file = await this.fileRepository.findById(id);

    if (!file)
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'fileNotFound',
        },
      });

    const s3 = new S3Client({
      region: (fileConfig() as FileConfig).awsS3Region ?? '',
      credentials: {
        accessKeyId: (fileConfig() as FileConfig).accessKeyId ?? '',
        secretAccessKey: (fileConfig() as FileConfig).secretAccessKey ?? '',
      },
    });

    const command = new DeleteObjectCommand({
      Bucket: (fileConfig() as FileConfig).awsDefaultS3Bucket ?? '',
      Key: file.path,
    });

    await s3.send(command)
      .catch((error) => {
        this.logger.error(error.message);
      });

    return this.fileRepository.delete(id).then(() => {
      return {
        status: HttpStatus.OK,
        message: 'File deleted successfully',
      };
    });
  }
}
