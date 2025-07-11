import { Transform }                        from 'class-transformer';
import { IsHexColor, IsNotEmpty, IsString } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({value}) => value.trim())
  readonly title: string;

  @IsString()
  @IsHexColor()
  @Transform(({value}) => value.trim())
  readonly color: string;
}
