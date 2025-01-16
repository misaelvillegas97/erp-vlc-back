import { ClientEntity } from '@modules/clients/domain/entities/client.entity';

export class ClientLightMapper implements Partial<ClientEntity> {
  readonly id: string;
  readonly businessName: string;
  readonly fantasyName: string;
  readonly code: string;

  constructor(values: Partial<ClientLightMapper>) {
    Object.assign(this, values);
  }

  static map(entity: ClientEntity): ClientLightMapper {
    return new ClientLightMapper({
      id: entity.id,
      businessName: entity.businessName,
      fantasyName: entity.fantasyName,
      code: entity.code,
    });
  }

  static mapAll(entities: ClientEntity[]): ClientLightMapper[] {
    return entities.map((entity) => this.map(entity));
  }
}
