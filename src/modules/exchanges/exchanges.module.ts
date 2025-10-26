import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exchange } from './entities/exchange.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exchange])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ExchangesModule {}
