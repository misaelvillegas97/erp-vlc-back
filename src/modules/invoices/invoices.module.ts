import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { InvoiceEntity }      from '@modules/invoices/domain/entities/invoice.entity';
import { InvoicesService }    from '@modules/invoices/invoices.service';
import { InvoicesController } from '@modules/invoices/invoices.controller';
import { CreditNoteEntity }   from '@modules/invoices/domain/entities/credit-note.entity';
import { PaymentEntity }      from '@modules/invoices/domain/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ InvoiceEntity, CreditNoteEntity, PaymentEntity ])
  ],
  controllers: [ InvoicesController ],
  providers: [ InvoicesService ],
  exports: [ InvoicesService ]
})
export class InvoicesModule {}
