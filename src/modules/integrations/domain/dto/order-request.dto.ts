import { CreateOrderDto }    from '@modules/orders/domain/dtos/create-order.dto';
import { ProductRequestDto } from './product-request.dto';
import { OrderType }         from '@modules/integrations/utils/order-type.util';
import { OrderStatusEnum }   from '@modules/orders/domain/enums/order-status.enum';

export class OrderRequestDto extends CreateOrderDto {
  static mapFromComercioNet(values: any): OrderRequestDto {
    return new OrderRequestDto({...values, provider: 'ComercioNet'});
  }

  static mapFromCencoB2B(values: any): CreateOrderDto {
    // eslint-disable-next-line prefer-const
    let {orderNumber, businessUnit, orderType, deliveryLocation, deliveryDate, emissionDate, ...others} = values.order;
    const products = values.orderDetails.map((product: any) => ProductRequestDto.mapFromCencoB2B(product));

    return new OrderRequestDto({
      orderNumber: orderNumber,
      businessName: businessUnit,
      type: orderType && OrderType.parseFromCencoB2B(orderType),
      status: OrderStatusEnum.PENDING,
      deliveryLocation: deliveryLocation,
      deliveryDate: deliveryDate.split('-').reverse().join('-'),
      emissionDate: emissionDate.split('-').reverse().join('-'),
      observation: '',
      products,
      additionalInfo: others,
    });
  }
}
