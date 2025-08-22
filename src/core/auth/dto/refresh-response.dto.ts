import { ApiProperty }  from '@nestjs/swagger';
import { User }         from '@modules/users/domain/user';
import { TenantEntity } from '@modules/tenant/domain/entities/tenant.entity';

export class RefreshResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  tokenExpires: number;

  @ApiProperty({
    type: () => User,
  })
  user: User;

  @ApiProperty({
    type: () => TenantEntity,
  })
  tenant?: TenantEntity;
}
