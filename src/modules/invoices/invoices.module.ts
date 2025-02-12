import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { InvoiceEntity }      from '@modules/invoices/domain/entities/invoice.entity';
import { InvoicesService }    from '@modules/invoices/invoices.service';
import { InvoicesController } from '@modules/invoices/invoices.controller';
import { OrdersModule }       from '@modules/orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ InvoiceEntity ]),
    forwardRef(() => OrdersModule)
  ],
  controllers: [ InvoicesController ],
  providers: [ InvoicesService ],
  exports: [ InvoicesService ]
})
export class InvoicesModule {}
