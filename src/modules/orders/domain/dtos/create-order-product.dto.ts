import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderProductDto {
  @IsUUID()
  public id: string;

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

  constructor(values: Partial<CreateOrderProductDto>) {
    Object.assign(this, values);
  }
}
