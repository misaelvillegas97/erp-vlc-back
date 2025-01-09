export enum OrderTypeEnum {
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  RETURN_ORDER = 'RETURN_ORDER',
}

export class OrderType {
  public static parseFromCencoB2B(type: string): string {
    switch (type) {
      case 'OC Tienda':
        return OrderTypeEnum.PURCHASE_ORDER;
      case 'Devoluciones Centralizadas':
        return OrderTypeEnum.RETURN_ORDER;
      default:
        return OrderTypeEnum.PURCHASE_ORDER;
    }
  }
}
