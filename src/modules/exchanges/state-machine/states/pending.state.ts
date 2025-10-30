import { BadRequestException } from '@nestjs/common';
import { IExchangeState } from '../exchange-state.interface';
import { Exchange } from '../../entities/exchange.entity';
import { AcceptedState } from './accepted.state';
import { DeclinedState } from './declined.state';
import { CancelledState } from './cancelled.state';

/**
 * Pending State
 *
 * Initial state when exchange is requested.
 * Waiting for owner's response.
 *
 * Valid Transitions:
 * - accept() → AcceptedState
 * - decline() → DeclinedState
 * - cancel() → CancelledState
 */
export class PendingState implements IExchangeState {
  getStateName(): string {
    return 'pending';
  }

  accept(exchange: Exchange): void {
    exchange.status = 'accepted';
    // State will be updated by ExchangeStateMachine
  }

  decline(exchange: Exchange): void {
    exchange.status = 'declined';
  }

  cancel(exchange: Exchange): void {
    exchange.status = 'cancelled';
  }

  startExchange(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot start exchange from pending state. Exchange must be accepted first.',
    );
  }

  complete(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot complete exchange from pending state. Exchange must be accepted first.',
    );
  }

  canCancel(): boolean {
    return true;
  }

  isTerminal(): boolean {
    return false;
  }
}
