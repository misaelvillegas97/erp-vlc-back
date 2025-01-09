import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderProductDto {
  @IsString()
  @IsNotEmpty()
  public readonly code: string;

  @IsString()
  @IsOptional()
  public readonly providerCode?: string;

  @IsString()
  @IsNotEmpty()
  public readonly upcCode: string;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

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

  constructor(values: Partial<CreateOrderProductDto>) {
    Object.assign(this, values);
  }
}
