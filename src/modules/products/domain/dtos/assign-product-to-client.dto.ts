import { IsNumber, IsUUID } from 'class-validator';

export class AssignProductToClientDto {
  @IsUUID()
  readonly clientId: string;

  @IsNumber()
  readonly providerCode: number;
}
