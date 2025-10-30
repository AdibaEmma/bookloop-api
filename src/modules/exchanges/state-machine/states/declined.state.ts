import { BadRequestException } from '@nestjs/common';
import { IExchangeState } from '../exchange-state.interface';
import { Exchange } from '../../entities/exchange.entity';

/**
 * Declined State (Terminal)
 *
 * Owner has declined the exchange request.
 * No further transitions allowed.
 */
export class DeclinedState implements IExchangeState {
  getStateName(): string {
    return 'declined';
  }

  accept(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot accept a declined exchange.',
    );
  }

  decline(exchange: Exchange): void {
    throw new BadRequestException(
      'Exchange is already declined.',
    );
  }

  cancel(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot cancel a declined exchange.',
    );
  }

  startExchange(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot start a declined exchange.',
    );
  }

  complete(exchange: Exchange): void {
    throw new BadRequestException(
      'Cannot complete a declined exchange.',
    );
  }

  canCancel(): boolean {
    return false;
  }

  isTerminal(): boolean {
    return true;
  }
}
