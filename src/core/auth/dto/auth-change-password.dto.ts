import { ApiProperty }                   from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, MinLength } from 'class-validator';

export class AuthChangePasswordDto {
  @ApiProperty({description: 'ID of the user to change password for'})
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({description: 'New password for the user'})
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
