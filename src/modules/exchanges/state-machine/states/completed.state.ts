import { BadRequestException } from '@nestjs/common';
import { IExchangeState } from '../exchange-state.interface';
import { Exchange } from '../../entities/exchange.entity';

/**
 * Completed State (Terminal)
 *
 * Exchange has been completed successfully.
 * Both parties confirmed completion.
 * No further transitions allowed.
 */
export class CompletedState implements IExchangeState {
  getStateName(): string {
    return 'completed';
  }

  accept(exchange: Exchange): void {
    throw new BadRequestException(
      'Exchange is already completed.',
    );
  }

  decline(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot decline a completed exchange.',
    );
  }

  cancel(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot cancel a completed exchange.',
    );
  }

  startExchange(exchange: Exchange): void {
    throw new BadRequestException(
      'Exchange is already completed.',
    );
  }

  complete(exchange: Exchange): void {
    throw new BadRequestException(
      'Exchange is already completed.',
    );
  }

  canCancel(): boolean {
    return false;
  }

  isTerminal(): boolean {
    return true;
  }
}
