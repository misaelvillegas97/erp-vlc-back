import { ProductRequestEntity }     from '../../../orders/domain/entities/product-request.entity';
import { parseCommaAndDotToNumber } from '@shared/utils/currency.util';

export class ProductRequestDto {
  public readonly code: string;
  public readonly providerCode: string;
  public readonly upcCode: string;
  public readonly description: string;
  public readonly quantity: number;
  public readonly unitaryPrice: number;
  public readonly totalPrice: number;
  public readonly additionalInfo?: Record<string, any>;

  constructor(values: Partial<ProductRequestDto>) {
    Object.assign(this, values);
  }

  static mapFromComercioNet(values: any): ProductRequestDto {
    return new ProductRequestDto({...values, provider: 'ComercioNet'});
  }

  static mapFromCencoB2B(values: any): ProductRequestDto {
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

  toEntity() {
    return new ProductRequestEntity({
      code: this.code,
      providerCode: this.providerCode,
      upcCode: this.upcCode,
      description: this.description,
      quantity: this.quantity,
      unitaryPrice: this.unitaryPrice,
      totalPrice: this.totalPrice,
      additionalInfo: this.additionalInfo,
    });
  }

  fromEntity(entity: ProductRequestEntity) {
    return new ProductRequestDto({
      code: entity.code,
      providerCode: entity.providerCode,
      upcCode: entity.upcCode,
      description: entity.description,
      quantity: entity.quantity,
      unitaryPrice: entity.unitaryPrice,
      totalPrice: entity.totalPrice,
      additionalInfo: entity.additionalInfo,
    });
  }
}
