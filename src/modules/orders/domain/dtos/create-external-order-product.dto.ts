import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExternalOrderProductDto {
  @IsString()
  @IsNotEmpty()
  public readonly code: string;

  @IsString()
  @IsOptional()
  public readonly providerCode?: string;

  @IsString()
  @IsNotEmpty()
  public upcCode: string;

  @IsString()
  @IsNotEmpty()
  public description: string;

  @IsNotEmpty()
  @IsNumber()
  public readonly quantity: number;

  @IsNotEmpty()
  @IsNumber()
  public readonly unitaryPrice: number;

  @IsNotEmpty()
  @IsNumber()
  public readonly totalPrice: number;

  @IsOptional()
  public readonly additionalInfo?: Record<string, any>;

  constructor(values: Partial<CreateExternalOrderProductDto>) {
    Object.assign(this, values);
  }
}
