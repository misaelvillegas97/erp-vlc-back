import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientController } from './controllers/client.controller';
import { ClientService } from './services/client.service';
import { Client } from './domain/entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientsModule {}
