import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../event-bus.service';
import { DomainEvent } from '@paybridge/shared-types';

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventBusService],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('emit', () => {
    it('should emit event and notify subscribers', (done) => {
      const eventData = { orderNo: 'TP123', merchantId: 'M001' };

      service.on(DomainEvent.TOPUP_ORDER_CREATED, (payload) => {
        expect(payload.eventType).toBe(DomainEvent.TOPUP_ORDER_CREATED);
        expect(payload.aggregateId).toBe('order-123');
        expect(payload.aggregateType).toBe('TopupOrder');
        expect(payload.data).toEqual(eventData);
        expect(payload.timestamp).toBeInstanceOf(Date);
        done();
      });

      service.emit(
        DomainEvent.TOPUP_ORDER_CREATED,
        'order-123',
        'TopupOrder',
        eventData,
      );
    });

    it('should return event ID', () => {
      const eventId = service.emit(
        DomainEvent.TOPUP_ORDER_CREATED,
        'order-123',
        'TopupOrder',
        {},
      );

      expect(eventId).toBeTruthy();
      expect(typeof eventId).toBe('string');
    });

    it('should include correlation ID in metadata', (done) => {
      service.on(DomainEvent.TOPUP_ORDER_CREATED, (payload) => {
        expect(payload.metadata?.correlationId).toBe('corr-123');
        done();
      });

      service.emit(
        DomainEvent.TOPUP_ORDER_CREATED,
        'order-123',
        'TopupOrder',
        {},
        { correlationId: 'corr-123' },
      );
    });
  });

  describe('emitAsync', () => {
    it('should wait for all handlers to complete', async () => {
      const results: number[] = [];

      service.on(DomainEvent.TOPUP_ORDER_CREATED, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });

      service.on(DomainEvent.TOPUP_ORDER_CREATED, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(2);
      });

      await service.emitAsync(
        DomainEvent.TOPUP_ORDER_CREATED,
        'order-123',
        'TopupOrder',
        {},
      );

      expect(results).toContain(1);
      expect(results).toContain(2);
    });
  });

  describe('on', () => {
    it('should return unsubscribe function', () => {
      let callCount = 0;

      const unsubscribe = service.on(DomainEvent.TOPUP_ORDER_CREATED, () => {
        callCount++;
      });

      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'id', 'Type', {});
      expect(callCount).toBe(1);

      unsubscribe();

      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'id', 'Type', {});
      expect(callCount).toBe(1); // Should not increase
    });

    it('should handle errors in handlers gracefully', (done) => {
      let secondHandlerCalled = false;

      service.on(DomainEvent.TOPUP_ORDER_CREATED, () => {
        throw new Error('Handler error');
      });

      service.on(DomainEvent.TOPUP_ORDER_CREATED, () => {
        secondHandlerCalled = true;
      });

      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'id', 'Type', {});

      // Give time for async error handling
      setTimeout(() => {
        expect(secondHandlerCalled).toBe(true);
        done();
      }, 50);
    });
  });

  describe('once', () => {
    it('should only trigger handler once', () => {
      let callCount = 0;

      service.once(DomainEvent.TOPUP_ORDER_CREATED, () => {
        callCount++;
      });

      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'id', 'Type', {});
      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'id', 'Type', {});
      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'id', 'Type', {});

      expect(callCount).toBe(1);
    });
  });

  describe('getHistory', () => {
    it('should return event history for aggregate', () => {
      service.emit(DomainEvent.TOPUP_ORDER_CREATED, 'order-123', 'TopupOrder', { step: 1 });
      service.emit(DomainEvent.TOPUP_ORDER_PAID, 'order-123', 'TopupOrder', { step: 2 });
      service.emit(DomainEvent.TOPUP_ORDER_SUCCESS, 'order-123', 'TopupOrder', { step: 3 });

      const history = service.getHistory('order-123');

      expect(history).toHaveLength(3);
      expect(history[0].eventType).toBe(DomainEvent.TOPUP_ORDER_CREATED);
      expect(history[1].eventType).toBe(DomainEvent.TOPUP_ORDER_PAID);
      expect(history[2].eventType).toBe(DomainEvent.TOPUP_ORDER_SUCCESS);
    });

    it('should return empty array for unknown aggregate', () => {
      const history = service.getHistory('unknown');
      expect(history).toEqual([]);
    });
  });

  describe('listenerCount', () => {
    it('should return correct listener count', () => {
      expect(service.listenerCount(DomainEvent.TOPUP_ORDER_CREATED)).toBe(0);

      service.on(DomainEvent.TOPUP_ORDER_CREATED, () => {});
      expect(service.listenerCount(DomainEvent.TOPUP_ORDER_CREATED)).toBe(1);

      service.on(DomainEvent.TOPUP_ORDER_CREATED, () => {});
      expect(service.listenerCount(DomainEvent.TOPUP_ORDER_CREATED)).toBe(2);
    });
  });
});
