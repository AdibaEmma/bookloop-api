import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ExchangesModule } from './modules/exchanges/exchanges.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MeetupSpotsModule } from './modules/meetup-spots/meetup-spots.module';

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
  {
    path: 'notifications',
    module: NotificationsModule,
  },
  {
    path: 'meetup-spots',
    module: MeetupSpotsModule,
  },
];

@Module({
  imports: [RouterModule.register(routes)],
  exports: [RouterModule],
})
export class RoutingModule {}
