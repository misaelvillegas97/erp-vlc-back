import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose } from 'class-transformer';

import { FileType }       from '../../files/domain/file';
import { Role }           from '../../roles/domain/role';
import { Status }         from '../../statuses/domain/status';
import { RoleUserEntity } from '@modules/roles/domain/entities/role-user.entity';

export class User {
  @ApiProperty({type: String})
  id: string;

  @ApiProperty({type: String, example: 'John Doe'})
  name?: string | null;

  @ApiProperty({type: String, example: 'john.doe@example.com'})
  email: string | null;

  @Exclude({toPlainOnly: true, toClassOnly: true})
  password?: string;

  @Exclude({toPlainOnly: true})
  previousPassword?: string;

  @ApiProperty({type: String, example: 'email'})
  @Expose({groups: [ 'me', 'admin' ]})
  provider: string;

  @ApiProperty({type: String, example: '1234567890'})
  @Expose({groups: [ 'me', 'admin' ]})
  socialId?: string | null;

  @ApiProperty({type: String, example: 'John'})
  firstName: string | null;

  @ApiProperty({type: String, example: 'Doe'})
  lastName: string | null;

  @ApiProperty({type: () => FileType})
  photo?: FileType | null;

  @ApiProperty({type: () => Role})
  role?: Role | null;

  @ApiProperty({type: () => RoleUserEntity})
  roles?: RoleUserEntity[];

  @ApiProperty({type: () => Status})
  status?: Status;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;
}
