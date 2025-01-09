export enum OrderStatusProviderEnum {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  UNKNOWN = 'UNKNOWN',
}

export class OrderStatusProvider {
  public static parseFromCencoB2B(status: string): string {
    switch (status) {
      case 'Aceptada':
        return OrderStatusProviderEnum.ACCEPTED;
      case 'Rechazada':
        return OrderStatusProviderEnum.REJECTED;
      case 'Pendiente':
        return OrderStatusProviderEnum.PENDING;
      default:
        return OrderStatusProviderEnum.UNKNOWN;
    }
  }
}
