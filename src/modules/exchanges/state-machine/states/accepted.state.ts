import { BadRequestException } from '@nestjs/common';
import { IExchangeState } from '../exchange-state.interface';
import { Exchange } from '../../entities/exchange.entity';

/**
 * Accepted State
 *
 * Owner has accepted the exchange request.
 * Parties can now arrange meetup and complete exchange.
 *
 * Valid Transitions:
 * - complete() → CompletedState (when both confirm)
 * - cancel() → CancelledState
 */
export class AcceptedState implements IExchangeState {
  getStateName(): string {
    return 'accepted';
  }

  accept(exchange: Exchange): void {
    throw new BadRequestException(
      'Exchange is already accepted.',
    );
  }

  decline(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot decline an already accepted exchange. Use cancel instead.',
    );
  }

  cancel(exchange: Exchange): void {
    exchange.status = 'cancelled';
  }

  startExchange(exchange: Exchange): void {
    // This is a logical state, not a DB status
    // Both parties have confirmed meetup details
    if (!exchange.requester_confirmed_meetup || !exchange.owner_confirmed_meetup) {
      throw new BadRequestException(
        'Both parties must confirm meetup details before starting exchange.',
      );
    }
    // Exchange remains in 'accepted' status until completion
  }

  complete(exchange: Exchange): void {
    // Check if both parties have confirmed completion
    if (!exchange.requester_confirmed_completion || !exchange.owner_confirmed_completion) {
      throw new BadRequestException(
        'Both parties must confirm completion before exchange can be marked as completed.',
      );
    }

    exchange.status = 'completed';
    exchange.completed_at = new Date();
  }

  canCancel(): boolean {
    return true;
  }

  isTerminal(): boolean {
    return false;
  }
}
