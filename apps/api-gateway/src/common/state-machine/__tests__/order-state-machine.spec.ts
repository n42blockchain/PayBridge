import {
  StateMachine,
  InvalidStateTransitionError,
  TopupOrderStateMachine,
  SettlementOrderStateMachine,
  RefundOrderStateMachine,
  type TopupOrderStatus,
  type SettlementOrderStatus,
  type RefundStatus,
} from '../order-state-machine';

describe('StateMachine', () => {
  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      const sm = new StateMachine<'A' | 'B' | 'C'>({
        A: ['B'],
        B: ['C'],
        C: [],
      });

      expect(sm.canTransition('A', 'B')).toBe(true);
      expect(sm.canTransition('B', 'C')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      const sm = new StateMachine<'A' | 'B' | 'C'>({
        A: ['B'],
        B: ['C'],
        C: [],
      });

      expect(sm.canTransition('A', 'C')).toBe(false);
      expect(sm.canTransition('C', 'A')).toBe(false);
      expect(sm.canTransition('B', 'A')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('should return all valid transitions from a state', () => {
      const sm = new StateMachine<'A' | 'B' | 'C' | 'D'>({
        A: ['B', 'C'],
        B: ['C', 'D'],
        C: ['D'],
        D: [],
      });

      expect(sm.getValidTransitions('A')).toEqual(['B', 'C']);
      expect(sm.getValidTransitions('D')).toEqual([]);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transitions', () => {
      const sm = new StateMachine<'A' | 'B'>({
        A: ['B'],
        B: [],
      });

      expect(() => sm.validateTransition('A', 'B')).not.toThrow();
    });

    it('should throw InvalidStateTransitionError for invalid transitions', () => {
      const sm = new StateMachine<'A' | 'B'>({
        A: ['B'],
        B: [],
      });

      expect(() => sm.validateTransition('B', 'A')).toThrow(
        InvalidStateTransitionError,
      );
    });
  });
});

describe('TopupOrderStateMachine', () => {
  const validTransitions: Array<[TopupOrderStatus, TopupOrderStatus]> = [
    ['PENDING', 'PAYING'],
    ['PENDING', 'CLOSED'],
    ['PENDING', 'FAILED'],
    ['PAYING', 'PAID'],
    ['PAYING', 'FAILED'],
    ['PAYING', 'CLOSED'],
    ['PAID', 'SUCCESS'],
    ['PAID', 'FAILED'],
    ['SUCCESS', 'REFUNDED'],
  ];

  const invalidTransitions: Array<[TopupOrderStatus, TopupOrderStatus]> = [
    ['PENDING', 'SUCCESS'],
    ['PAYING', 'REFUNDED'],
    ['CLOSED', 'PAYING'],
    ['SUCCESS', 'PENDING'],
    ['FAILED', 'SUCCESS'],
    ['REFUNDED', 'SUCCESS'],
  ];

  it.each(validTransitions)(
    'should allow transition from %s to %s',
    (from, to) => {
      expect(TopupOrderStateMachine.canTransition(from, to)).toBe(true);
    },
  );

  it.each(invalidTransitions)(
    'should NOT allow transition from %s to %s',
    (from, to) => {
      expect(TopupOrderStateMachine.canTransition(from, to)).toBe(false);
    },
  );

  it('terminal states should have no transitions', () => {
    expect(TopupOrderStateMachine.getValidTransitions('FAILED')).toEqual([]);
    expect(TopupOrderStateMachine.getValidTransitions('CLOSED')).toEqual([]);
    expect(TopupOrderStateMachine.getValidTransitions('REFUNDED')).toEqual([]);
  });
});

describe('SettlementOrderStateMachine', () => {
  const validTransitions: Array<[SettlementOrderStatus, SettlementOrderStatus]> = [
    ['PENDING', 'PENDING_AUDIT'],
    ['PENDING', 'FAILED'],
    ['PENDING_AUDIT', 'AUDITING'],
    ['AUDITING', 'APPROVED'],
    ['AUDITING', 'REJECTED'],
    ['AUDITING', 'PENDING_AUDIT'], // Back to previous audit level
    ['APPROVED', 'SETTLING'],
    ['APPROVED', 'FAILED'],
    ['SETTLING', 'SUCCESS'],
    ['SETTLING', 'FAILED'],
  ];

  const invalidTransitions: Array<[SettlementOrderStatus, SettlementOrderStatus]> = [
    ['PENDING', 'SUCCESS'],
    ['PENDING_AUDIT', 'SUCCESS'],
    ['APPROVED', 'PENDING'],
    ['REJECTED', 'APPROVED'],
    ['SUCCESS', 'PENDING'],
    ['FAILED', 'SUCCESS'],
  ];

  it.each(validTransitions)(
    'should allow transition from %s to %s',
    (from, to) => {
      expect(SettlementOrderStateMachine.canTransition(from, to)).toBe(true);
    },
  );

  it.each(invalidTransitions)(
    'should NOT allow transition from %s to %s',
    (from, to) => {
      expect(SettlementOrderStateMachine.canTransition(from, to)).toBe(false);
    },
  );

  it('terminal states should have no transitions', () => {
    expect(SettlementOrderStateMachine.getValidTransitions('REJECTED')).toEqual([]);
    expect(SettlementOrderStateMachine.getValidTransitions('SUCCESS')).toEqual([]);
    expect(SettlementOrderStateMachine.getValidTransitions('FAILED')).toEqual([]);
  });
});

describe('RefundOrderStateMachine', () => {
  const validTransitions: Array<[RefundStatus, RefundStatus]> = [
    ['PENDING', 'PROCESSING'],
    ['PENDING', 'REJECTED'],
    ['PENDING', 'FAILED'],
    ['PROCESSING', 'SUCCESS'],
    ['PROCESSING', 'FAILED'],
  ];

  const invalidTransitions: Array<[RefundStatus, RefundStatus]> = [
    ['PENDING', 'SUCCESS'],
    ['PROCESSING', 'PENDING'],
    ['SUCCESS', 'PENDING'],
    ['FAILED', 'SUCCESS'],
    ['REJECTED', 'PROCESSING'],
  ];

  it.each(validTransitions)(
    'should allow transition from %s to %s',
    (from, to) => {
      expect(RefundOrderStateMachine.canTransition(from, to)).toBe(true);
    },
  );

  it.each(invalidTransitions)(
    'should NOT allow transition from %s to %s',
    (from, to) => {
      expect(RefundOrderStateMachine.canTransition(from, to)).toBe(false);
    },
  );

  it('terminal states should have no transitions', () => {
    expect(RefundOrderStateMachine.getValidTransitions('SUCCESS')).toEqual([]);
    expect(RefundOrderStateMachine.getValidTransitions('FAILED')).toEqual([]);
    expect(RefundOrderStateMachine.getValidTransitions('REJECTED')).toEqual([]);
  });
});
