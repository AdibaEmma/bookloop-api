import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ExchangesModule } from './modules/exchanges/exchanges.module';

const routes: Routes = [
  {
    path: 'auth',
    module: AuthModule,
  },
  {
    path: 'users',
    module: UsersModule,
  },
  {
    path: 'books',
    module: BooksModule,
  },
  {
    path: 'listings',
    module: ListingsModule,
  },
  {
    path: 'exchanges',
    module: ExchangesModule,
  },
];

@Module({
  imports: [RouterModule.register(routes)],
  exports: [RouterModule],
})
export class RoutingModule {}
