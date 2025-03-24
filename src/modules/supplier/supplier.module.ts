import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { SupplierEntity }      from '@modules/supplier/domain/entities/supplier.entity';
import { SuppliersService }    from '@modules/supplier/supplier.service';
import { SuppliersController } from '@modules/supplier/supplier.controller';

@Module({
  imports: [ TypeOrmModule.forFeature([ SupplierEntity ]) ],
  controllers: [ SuppliersController ],
  providers: [ SuppliersService ]
})
export class SupplierModule {}
