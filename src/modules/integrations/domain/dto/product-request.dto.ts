import { parseCommaAndDotToNumber } from '@shared/utils/currency.util';
import { CreateOrderProductDto }    from '@modules/orders/domain/dtos/create-order-product.dto';

export class ProductRequestDto extends CreateOrderProductDto {
  static mapFromComercioNet(values: any): CreateOrderProductDto {
    const {item: code, upcCode, providerCode, observation, quantity, unitPrice: unitaryPrice, totalPrice, ...others} = values;

    const parsedQuantity = parseCommaAndDotToNumber(quantity);
    const parsedUnitaryPrice = parseCommaAndDotToNumber(unitaryPrice);
    const parsedTotalPrice = parseCommaAndDotToNumber(totalPrice);

    return new ProductRequestDto({
      code,
      upcCode,
      providerCode,
      description: observation,
      quantity: parsedQuantity,
      unitaryPrice: parsedUnitaryPrice,
      totalPrice: parsedTotalPrice,
      additionalInfo: others,
    });
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
      description,
      quantity,
      unitaryPrice,
      totalPrice,
      additionalInfo: others,
    });
  }
}
