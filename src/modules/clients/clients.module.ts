import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { ClientController } from './client.controller';
import { ClientService }    from './client.service';
import { ClientEntity }     from './domain/entities/client.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ ClientEntity ]) ],
  controllers: [ ClientController ],
  providers: [ ClientService ],
  exports: [ ClientService, TypeOrmModule ],
})
export class ClientsModule {}
