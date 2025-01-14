import { ClientEntity }                    from '@modules/clients/domain/entities/client.entity';
import { ApiProperty }                     from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

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

  @ApiProperty({example: 'email@example.com', type: String})
  @IsNotEmpty()
  @IsEmail()
  public readonly email: string;

  @ApiProperty({example: '12345678901', type: String})
  @IsOptional()
  public readonly phoneNumber: string;
}