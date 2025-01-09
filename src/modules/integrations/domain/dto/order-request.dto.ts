import { CreateOrderDto }      from '@modules/orders/domain/dtos/create-order.dto';
import { OrderStatusProvider } from '../enums/order-status-provider.enum';
import { ProductRequestDto }   from './product-request.dto';
import { OrderType }           from '@modules/integrations/utils/order-type.util';

export class OrderRequestDto extends CreateOrderDto {
  static mapFromComercioNet(values: any): OrderRequestDto {
    return new OrderRequestDto({...values, provider: 'ComercioNet'});
  }

  static mapFromCencoB2B(values: any): CreateOrderDto {
    // eslint-disable-next-line prefer-const
    let {orderNumber, businessUnit, orderType, status, deliveryLocation, deliveryDate, emissionDate, ...others} = values.order;
    const products = values.orderDetails.map((product: any) => ProductRequestDto.mapFromCencoB2B(product));

    return new OrderRequestDto({
      orderNumber: orderNumber,
      businessName: businessUnit,
      type: orderType && OrderType.parseFromCencoB2B(orderType),
      status: status && OrderStatusProvider.parseFromCencoB2B(status),
      deliveryLocation: deliveryLocation,
      deliveryDate: deliveryDate.split('-').reverse().join('-'),
      emissionDate: emissionDate.split('-').reverse().join('-'),
      observation: '',
      products,
      additionalInfo: others,
    });
  }
}
