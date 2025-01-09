import { ApiProperty } from '@nestjs/swagger';
import { User }        from '@modules/users/domain/user';
import { Exclude }     from 'class-transformer';

export class LoginResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  @Exclude()
  refreshToken: string;

  @ApiProperty()
  @Exclude()
  refreshTokenExpires: number;

  @ApiProperty()
  tokenExpires: number;

  @ApiProperty({
    type: () => User,
  })
  user: User;
}
