import { ApiPropertyOptional }                        from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Transform }                                  from 'class-transformer';
import { FileDto }                                    from '@modules/files/dto/file.dto';
import { lowerCaseTransformer }                       from '@shared/utils/transformers/lower-case.transformer';

export class AuthUpdateDto {
  @ApiPropertyOptional({type: () => FileDto})
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({example: 'John'})
  @IsOptional()
  @IsNotEmpty({message: 'mustBeNotEmpty'})
  firstName?: string;

  @ApiPropertyOptional({example: 'Doe'})
  @IsOptional()
  @IsNotEmpty({message: 'mustBeNotEmpty'})
  lastName?: string;

  @ApiPropertyOptional({example: 'new.email@example.com'})
  @IsOptional()
  @IsNotEmpty()
  @IsEmail()
  @Transform(lowerCaseTransformer)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty({message: 'mustBeNotEmpty'})
  oldPassword?: string;
}
