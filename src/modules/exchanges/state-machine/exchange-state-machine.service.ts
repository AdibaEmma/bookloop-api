import { Injectable } from '@nestjs/common';
import { IExchangeState } from './exchange-state.interface';
import { Exchange } from '../entities/exchange.entity';
import { PendingState } from './states/pending.state';
import { AcceptedState } from './states/accepted.state';
import { DeclinedState } from './states/declined.state';
import { CompletedState } from './states/completed.state';
import { CancelledState } from './states/cancelled.state';

/**
 * Exchange State Machine Service
 *
 * Manages exchange state transitions using the State Pattern.
 *
 * SOLID Principles Applied:
 * - Open/Closed: New states can be added without modifying this class
 * - Single Responsibility: Only manages state transitions
 * - State Pattern: Delegates behavior to state objects
 *
 * Benefits:
 * - Enforces valid state transitions
 * - Eliminates complex if/else chains
 * - Each state is independently testable
 * - Clear visualization of state flow
 *
 * Design Decision:
 * - State objects are stateless singletons (created once)
 * - Exchange entity holds current status
 * - State machine maps status to state objects
 *
 * Tradeoff:
 * - More classes vs. simple switch statement
 * - Worth it for complex workflows with many transitions
 * - Makes adding new states/transitions trivial
 */
@Injectable()
export class ExchangeStateMachine {
  private readonly states: Map<string, IExchangeState>;

  constructor() {
    // Initialize all state objects
    this.states = new Map<string, IExchangeState>([
      ['pending', new PendingState()],
      ['accepted', new AcceptedState()],
      ['declined', new DeclinedState()],
      ['completed', new CompletedState()],
      ['cancelled', new CancelledState()],
    ]);
  }

  /**
   * Get current state object for an exchange
   *
   * @param exchange - Exchange entity
   * @returns Current state object
   */
  private getCurrentState(exchange: Exchange): IExchangeState {
    const state = this.states.get(exchange.status);
    if (!state) {
      throw new Error(`Invalid exchange status: ${exchange.status}`);
    }
    return state;
  }

  /**
   * Accept exchange
   * Transition: pending → accepted
   *
   * @param exchange - Exchange entity
   */
  accept(exchange: Exchange): void {
    const currentState = this.getCurrentState(exchange);
    currentState.accept(exchange);
  }

  /**
   * Decline exchange
   * Transition: pending → declined
   *
   * @param exchange - Exchange entity
   */
  decline(exchange: Exchange): void {
    const currentState = this.getCurrentState(exchange);
    currentState.decline(exchange);
  }

  /**
   * Cancel exchange
   * Transition: pending|accepted → cancelled
   *
   * @param exchange - Exchange entity
   */
  cancel(exchange: Exchange): void {
    const currentState = this.getCurrentState(exchange);
    currentState.cancel(exchange);
  }

  /**
   * Start exchange (logical state, not DB status)
   * Validates that meetup is confirmed by both parties
   *
   * @param exchange - Exchange entity
   */
  startExchange(exchange: Exchange): void {
    const currentState = this.getCurrentState(exchange);
    currentState.startExchange(exchange);
  }

  /**
   * Complete exchange
   * Transition: accepted → completed (requires both confirmations)
   *
   * @param exchange - Exchange entity
   */
  complete(exchange: Exchange): void {
    const currentState = this.getCurrentState(exchange);
    currentState.complete(exchange);
  }

  /**
   * Check if exchange can be cancelled
   *
   * @param exchange - Exchange entity
   * @returns True if cancellation is allowed
   */
  canCancel(exchange: Exchange): boolean {
    const currentState = this.getCurrentState(exchange);
    return currentState.canCancel();
  }

  /**
   * Check if exchange is in terminal state
   *
   * @param exchange - Exchange entity
   * @returns True if no more transitions possible
   */
  isTerminal(exchange: Exchange): boolean {
    const currentState = this.getCurrentState(exchange);
    return currentState.isTerminal();
  }

  /**
   * Get available actions for current state
   * Useful for UI to show available buttons/options
   *
   * @param exchange - Exchange entity
   * @param userId - User ID (to determine which actions are available)
   * @returns Array of available action names
   */
  getAvailableActions(exchange: Exchange, userId: string): string[] {
    const actions: string[] = [];
    const currentState = this.getCurrentState(exchange);

    if (currentState.isTerminal()) {
      return [];
    }

    // Pending state actions
    if (exchange.status === 'pending') {
      if (userId === exchange.owner_id) {
        actions.push('accept', 'decline');
      }
      actions.push('cancel');
    }

    // Accepted state actions
    if (exchange.status === 'accepted') {
      // Meetup confirmation
      if (!exchange.requester_confirmed_meetup && userId === exchange.requester_id) {
        actions.push('confirm_meetup');
      }
      if (!exchange.owner_confirmed_meetup && userId === exchange.owner_id) {
        actions.push('confirm_meetup');
      }

      // Completion confirmation
      if (!exchange.requester_confirmed_completion && userId === exchange.requester_id) {
        actions.push('confirm_completion');
      }
      if (!exchange.owner_confirmed_completion && userId === exchange.owner_id) {
        actions.push('confirm_completion');
      }

      actions.push('cancel');
    }

    return actions;
  }

  /**
   * Validate state transition
   * Useful for testing and debugging
   *
   * @param fromStatus - Current status
   * @param toStatus - Target status
   * @returns True if transition is valid
   */
  isValidTransition(
    fromStatus: string,
    toStatus: string,
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'declined', 'cancelled'],
      accepted: ['completed', 'cancelled'],
      declined: [],
      completed: [],
      cancelled: [],
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Get state flow diagram as text
   * Useful for documentation
   *
   * @returns ASCII diagram of state flow
   */
  getStateFlowDiagram(): string {
    return `
Exchange State Flow:
--------------------

              ┌─────────┐
              │ pending │
              └────┬────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
         ▼         ▼         ▼
    ┌─────────┐ ┌──────────┐ ┌───────────┐
    │declined │ │ accepted │ │ cancelled │
    └─────────┘ └────┬─────┘ └───────────┘
                     │
                     ▼
                ┌───────────┐
                │ completed │
                └───────────┘

Valid Transitions:
- pending → accepted (owner accepts)
- pending → declined (owner declines)
- pending → cancelled (either party cancels)
- accepted → completed (both confirm)
- accepted → cancelled (either party cancels)
    `;
  }
}
