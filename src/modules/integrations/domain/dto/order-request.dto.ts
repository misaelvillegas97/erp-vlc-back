import { ProductRequestDto }   from './product-request.dto';
import { OrderEntity }         from '../../../orders/domain/entities/order.entity';
import { OrderStatusProvider } from '../enums/order-status-provider.enum';
import { OrderType }           from '../enums/order-type.enum';

export class OrderRequestDto {
  public orderNumber: string;
  public provider: string;
  public businessName: string;
  public type: string;
  public status: string;
  public deliveryLocation: string;
  public deliveryDate: string;
  public emissionDate: string;
  public observation?: string;
  public products: ProductRequestDto[];
  public additionalInfo?: Record<string, any>;

  constructor(values: Partial<OrderRequestDto>) {
    Object.assign(this, values);
  }

  static mapFromComercioNet(values: any): OrderRequestDto {
    return new OrderRequestDto({...values, provider: 'ComercioNet'});
  }

  static mapFromCencoB2B(values: any): OrderRequestDto {
    const {orderNumber, businessUnit, orderType, status, deliveryLocation, deliveryDate, emissionDate, ...others} = values.order;
    const products = values.orderDetails.map((product: any) => ProductRequestDto.mapFromCencoB2B(product));

    return new OrderRequestDto({
      orderNumber: orderNumber,
      businessName: businessUnit,
      provider: 'CencosudB2B',
      type: orderType && OrderType.parseFromCencoB2B(orderType),
      status: status && OrderStatusProvider.parseFromCencoB2B(status),
      deliveryLocation: deliveryLocation,
      deliveryDate: deliveryDate,
      emissionDate: emissionDate,
      observation: '',
      products,
      additionalInfo: others,
    });
  }

  toEntity() {
    return new OrderEntity({
      orderNumber: this.orderNumber,
      businessName: this.businessName,
      provider: this.provider,
      type: this.type,
      status: this.status,
      deliveryLocation: this.deliveryLocation,
      deliveryDate: this.deliveryDate,
      emissionDate: this.emissionDate,
      observation: this.observation,
      products: this.products.map((product) => product.toEntity()),
      additionalInfo: this.additionalInfo,
    });
  }
}
