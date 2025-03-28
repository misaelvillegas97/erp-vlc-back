import { Module }                            from '@nestjs/common';
import { TypeOrmModule }                     from '@nestjs/typeorm';
import { SupplierInvoiceEntity }             from './domain/entities/supplier-invoice.entity';
import { SupplierPaymentEntity }             from './domain/entities/supplier-payment.entity';
import { SupplierInvoicesService }           from './supplier-invoices.service';
import { SupplierInvoicesController }        from './supplier-invoices.controller';
import { SupplierInvoiceObservationsEntity } from '@modules/supplier-invoices/domain/entities/supplier-invoice-observations.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ SupplierInvoiceEntity, SupplierPaymentEntity, SupplierInvoiceObservationsEntity ])
  ],
  controllers: [ SupplierInvoicesController ],
  providers: [ SupplierInvoicesService ],
  exports: [ SupplierInvoicesService ]
})
export class SupplierInvoicesModule {}
