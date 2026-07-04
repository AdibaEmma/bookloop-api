import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exchange } from './entities/exchange.entity';
import { Rating } from './entities/rating.entity';
import { ExchangesController } from './exchanges.controller';
import { ExchangeService } from './services/exchange.service';
import { RatingService } from './services/rating.service';
import { QRHandoverService } from './services/qr-handover.service';
import { ExchangeStateMachine } from './state-machine/exchange-state-machine.service';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * ExchangesModule
 *
 * Provides exchange workflow and rating functionality.
 *
 * Services:
 * - ExchangeService: Exchange lifecycle management
 * - RatingService: Rating and review system (SRP)
 * - QRHandoverService: QR code generation and verification for handovers
 * - ExchangeStateMachine: State pattern for status transitions
 *
 * State Pattern:
 * - PendingState, AcceptedState, DeclinedState, CompletedState, CancelledState
 * - Enforces valid transitions
 * - Eliminates complex conditionals
 *
 * Imports:
 * - ListingsModule: For ListingService (marking listings as reserved/exchanged)
 * - UsersModule: For UserService (updating user ratings)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Exchange, Rating]),
    ListingsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [ExchangesController],
  providers: [
    ExchangeService,
    RatingService,
    QRHandoverService,
    ExchangeStateMachine,
  ],
  exports: [TypeOrmModule, ExchangeService, RatingService, QRHandoverService],
})
export class ExchangesModule {}
