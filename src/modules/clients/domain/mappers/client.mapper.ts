import { ClientEntity }  from '@modules/clients/domain/entities/client.entity';
import { ClientAddress } from '@modules/clients/domain/models/client-address';

export class ClientMapper implements Partial<ClientEntity> {
  readonly id: string;
  readonly businessName: string;
  readonly fantasyName: string;
  readonly code: string;
  readonly nationalId: string;
  readonly email: string;
  readonly phoneNumber?: string;
  readonly address?: ClientAddress[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date;

  constructor(values: Partial<ClientMapper>) {
    Object.assign(this, values);
  }

  static map(entity: ClientEntity): ClientMapper {
    return new ClientMapper({
      id: entity.id,
      businessName: entity.businessName,
      fantasyName: entity.fantasyName,
      code: entity.code,
      nationalId: entity.nationalId,
      email: entity.email,
      phoneNumber: entity.phoneNumber,
      address: entity.address,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  static mapAll(entities: ClientEntity[]): ClientMapper[] {
    return entities.map((entity) => this.map(entity));
  }
}
