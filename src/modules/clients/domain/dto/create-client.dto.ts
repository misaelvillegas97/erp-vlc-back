import { ClientEntity }                    from '@modules/clients/domain/entities/client.entity';
import { ApiProperty }                     from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { ClientAddress }                   from '@modules/clients/domain/models/client-address';

export class CreateClientDto implements Partial<ClientEntity> {

  @ApiProperty({example: '12345678901', type: String})
  @IsNotEmpty()
  public readonly nationalId: string;

  @ApiProperty({example: 'Business Name', type: String})
  @IsNotEmpty()
  public readonly businessName: string;

  @ApiProperty({example: 'Fantasy Name', type: String})
  @IsNotEmpty()
  public readonly fantasyName: string;

  @ApiProperty({example: 'CODE123', type: String})
  @IsOptional()
  public readonly code: string;

  @ApiProperty({example: 'email@example.com', type: String})
  @IsNotEmpty()
  @IsEmail()
  public readonly email: string;

  @ApiProperty({example: '12345678901', type: String})
  @IsOptional()
  public readonly phoneNumber: string;

  @ApiProperty({example: '', type: Object})
  @IsOptional()
  public readonly address: ClientAddress[];
}
