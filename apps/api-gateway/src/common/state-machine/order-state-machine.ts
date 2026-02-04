/**
 * Order State Machine
 * Manages valid state transitions for orders
 */

export type TopupOrderStatus =
  | 'PENDING'
  | 'PAYING'
  | 'PAID'
  | 'SUCCESS'
  | 'FAILED'
  | 'CLOSED'
  | 'REFUNDED';

export type SettlementOrderStatus =
  | 'PENDING'
  | 'PENDING_AUDIT'
  | 'AUDITING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SETTLING'
  | 'SUCCESS'
  | 'FAILED';

export type RefundStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED';

/**
 * State transition definition
 */
interface StateTransition<T extends string> {
  from: T[];
  to: T;
  guard?: () => boolean;
}

/**
 * Generic state machine class
 */
export class StateMachine<T extends string> {
  private readonly transitions: Map<T, T[]> = new Map();

  constructor(transitionMap: Record<T, T[]>) {
    for (const [from, toStates] of Object.entries(transitionMap) as [T, T[]][]) {
      this.transitions.set(from, toStates);
    }
  }

  /**
   * Check if transition from one state to another is valid
   */
  canTransition(from: T, to: T): boolean {
    const allowedStates = this.transitions.get(from);
    if (!allowedStates) {
      return false;
    }
    return allowedStates.includes(to);
  }

  /**
   * Get all valid transitions from a state
   */
  getValidTransitions(from: T): T[] {
    return this.transitions.get(from) ?? [];
  }

  /**
   * Validate transition and throw if invalid
   */
  validateTransition(from: T, to: T): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to);
    }
  }
}

/**
 * Custom error for invalid state transitions
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly fromState: string,
    public readonly toState: string,
  ) {
    super(`Invalid state transition from "${fromState}" to "${toState}"`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Topup order state machine
 */
export const TopupOrderStateMachine = new StateMachine<TopupOrderStatus>({
  PENDING: ['PAYING', 'CLOSED', 'FAILED'],
  PAYING: ['PAID', 'FAILED', 'CLOSED'],
  PAID: ['SUCCESS', 'FAILED'],
  SUCCESS: ['REFUNDED'],
  FAILED: [],
  CLOSED: [],
  REFUNDED: [],
});

/**
 * Settlement order state machine
 */
export const SettlementOrderStateMachine = new StateMachine<SettlementOrderStatus>({
  PENDING: ['PENDING_AUDIT', 'FAILED'],
  PENDING_AUDIT: ['AUDITING'],
  AUDITING: ['APPROVED', 'REJECTED', 'PENDING_AUDIT'],
  APPROVED: ['SETTLING', 'FAILED'],
  REJECTED: [],
  SETTLING: ['SUCCESS', 'FAILED'],
  SUCCESS: [],
  FAILED: [],
});

/**
 * Refund order state machine
 */
export const RefundOrderStateMachine = new StateMachine<RefundStatus>({
  PENDING: ['PROCESSING', 'REJECTED', 'FAILED'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  SUCCESS: [],
  FAILED: [],
  REJECTED: [],
});

/**
 * State machine registry for easy access
 */
export const OrderStateMachines = {
  topup: TopupOrderStateMachine,
  settlement: SettlementOrderStateMachine,
  refund: RefundOrderStateMachine,
} as const;

/**
 * Helper type for order type
 */
export type OrderType = keyof typeof OrderStateMachines;
