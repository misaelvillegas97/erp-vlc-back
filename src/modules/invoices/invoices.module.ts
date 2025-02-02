import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { InvoiceEntity }   from '@modules/invoices/domain/entities/invoice.entity';
import { InvoicesService } from '@modules/invoices/invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ InvoiceEntity ])
  ],
  controllers: [],
  providers: [ InvoicesService ],
  exports: [ InvoicesService ]
})
export class InvoicesModule {}
