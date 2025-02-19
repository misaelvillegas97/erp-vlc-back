import { CreateOrderDto }    from '@modules/orders/domain/dtos/create-order.dto';
import { ProductRequestDto } from './product-request.dto';
import { OrderType }         from '@modules/integrations/utils/order-type.util';
import { OrderStatusEnum }   from '@modules/orders/domain/enums/order-status.enum';
import { OrderTypeEnum }     from '@modules/orders/domain/enums/order-type.enum';

export class OrderRequestDto extends CreateOrderDto {
  static mapFromComercioNet(values: any): OrderRequestDto {
    const {id: orderNumber, issuer: businessName, deliveryLocation, receptionDate, ...additional} = values;
    const {shipmentDate, deliveryLocation: deliveryLocation2, orderType, ...other} = values.detail;

    // map from DD/mm/YYYY HH:mm to YYYY-mm-DD
    const emissionDate = receptionDate.split(' ')[0].split('/').reverse().join('-');
    const deliveryDate = shipmentDate.split('/').reverse().join('-');

    return new OrderRequestDto(
      {
        orderNumber,
        businessName,
        type: orderType == '37' ? OrderTypeEnum.PURCHASE_ORDER : OrderTypeEnum.UNKNOWN,
        status: OrderStatusEnum.PENDING,
        deliveryLocation: `${ deliveryLocation2 } - ${ deliveryLocation }`,
        deliveryDate,
        emissionDate,
        observation: '',
        products: values.detail.products.map(ProductRequestDto.mapFromComercioNet),
        additionalInfo: {...additional, ...other},
      });
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
