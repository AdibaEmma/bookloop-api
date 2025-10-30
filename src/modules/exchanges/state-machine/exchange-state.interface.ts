import { Exchange } from '../entities/exchange.entity';

/**
 * Exchange State Interface
 *
 * SOLID Principles Applied:
 * - Open/Closed Principle: New states can be added without modifying existing states
 * - State Pattern: Encapsulates state-specific behavior
 * - Single Responsibility: Each state handles only its own transitions
 *
 * State Pattern Benefits:
 * - Eliminates complex conditional logic (if/else chains)
 * - Each state is a separate class with clear responsibilities
 * - Valid transitions are enforced at compile time
 * - Easy to add new states or modify transitions
 *
 * Exchange Status Flow:
 * 1. pending (initial state)
 *    → accept() → accepted
 *    → decline() → declined
 *    → cancel() → cancelled
 *
 * 2. accepted
 *    → complete() → completed (requires both confirmations)
 *    → cancel() → cancelled
 *
 * 3. declined (terminal state)
 * 4. completed (terminal state)
 * 5. cancelled (terminal state)
 *
 * Tradeoff:
 * - More classes (one per state) vs. simple enum with if/else
 * - Worth it for complex workflows with multiple transitions
 * - Prevents invalid state transitions
 */

export interface IExchangeState {
  /**
   * Get the state name
   */
  getStateName(): string;

  /**
   * Accept the exchange (owner accepts requester's request)
   * Only valid from 'pending' state
   *
   * @param exchange - Exchange entity
   * @throws BadRequestException if invalid transition
   */
  accept(exchange: Exchange): void;

  /**
   * Decline the exchange (owner declines requester's request)
   * Only valid from 'pending' state
   *
   * @param exchange - Exchange entity
   * @throws BadRequestException if invalid transition
   */
  decline(exchange: Exchange): void;

  /**
   * Cancel the exchange (either party cancels)
   * Valid from 'pending' or 'accepted' states
   *
   * @param exchange - Exchange entity
   * @throws BadRequestException if invalid transition
   */
  cancel(exchange: Exchange): void;

  /**
   * Mark exchange as in progress (meetup confirmed by both parties)
   * Only valid from 'accepted' state
   *
   * @param exchange - Exchange entity
   * @throws BadRequestException if invalid transition
   */
  startExchange(exchange: Exchange): void;

  /**
   * Complete the exchange (both parties confirm completion)
   * Only valid from 'accepted' state
   *
   * @param exchange - Exchange entity
   * @throws BadRequestException if invalid transition
   */
  complete(exchange: Exchange): void;

  /**
   * Check if exchange can be cancelled in current state
   *
   * @returns True if cancellation is allowed
   */
  canCancel(): boolean;

  /**
   * Check if exchange is in a terminal state
   *
   * @returns True if state is terminal (no more transitions)
   */
  isTerminal(): boolean;
}
