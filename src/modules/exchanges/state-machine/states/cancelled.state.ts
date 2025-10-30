import { BadRequestException } from '@nestjs/common';
import { IExchangeState } from '../exchange-state.interface';
import { Exchange } from '../../entities/exchange.entity';

/**
 * Cancelled State (Terminal)
 *
 * Exchange was cancelled by either party.
 * No further transitions allowed.
 */
export class CancelledState implements IExchangeState {
  getStateName(): string {
    return 'cancelled';
  }

  accept(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot accept a cancelled exchange.',
    );
  }

  decline(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot decline a cancelled exchange.',
    );
  }

  cancel(exchange: Exchange): void {
    throw new BadRequestException(
      'Exchange is already cancelled.',
    );
  }

  startExchange(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot start a cancelled exchange.',
    );
  }

  complete(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot complete a cancelled exchange.',
    );
  }

  canCancel(): boolean {
    return false;
  }

  isTerminal(): boolean {
    return true;
  }
}
