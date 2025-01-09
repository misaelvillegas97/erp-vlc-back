import { parseCommaAndDotToNumber } from '@shared/utils/currency.util';
import { CreateOrderProductDto }    from '@modules/orders/domain/dtos/create-order-product.dto';

export class ProductRequestDto extends CreateOrderProductDto {
  static mapFromComercioNet(values: any): CreateOrderProductDto {
    return new ProductRequestDto({...values, provider: 'ComercioNet'});
  }

  static mapFromCencoB2B(values: any): CreateOrderProductDto {
    const {productCode, providerCode, barcode, description, requestedQty, finalCost, ...others} = values;

    // Number format 10.000,00 -> 10000.00
    const quantity = parseCommaAndDotToNumber(requestedQty);
    const unitaryPrice = parseCommaAndDotToNumber(finalCost);
    const totalPrice = quantity * unitaryPrice;

    return new ProductRequestDto({
      code: productCode,
      providerCode: providerCode,
      upcCode: barcode,
      description: description,
      quantity,
      unitaryPrice,
      totalPrice,
      additionalInfo: others,
    });
  }
}
