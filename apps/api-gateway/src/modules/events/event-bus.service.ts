import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import { randomUUID } from 'crypto';
import { DomainEvent, DomainEventPayload } from '@paybridge/shared-types';

export interface EventHandler<T = unknown> {
  (payload: DomainEventPayload<T>): void | Promise<void>;
}

export interface EmitOptions {
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Causation ID (ID of event that caused this) */
  causationId?: string;
  /** User ID who triggered the event */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Event bus service for domain events
 * Provides loose coupling between modules through event-driven communication
 */
@Injectable()
export class EventBusService implements OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly emitter: EventEmitter2;
  private readonly eventHistory: Map<string, DomainEventPayload[]> = new Map();
  private readonly maxHistorySize = 100;

  constructor() {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 50,
      verboseMemoryLeak: true,
    });
  }

  onModuleDestroy() {
    this.emitter.removeAllListeners();
    this.eventHistory.clear();
  }

  /**
   * Emit a domain event
   * @param event - Event type
   * @param aggregateId - ID of the aggregate (e.g., orderId)
   * @param aggregateType - Type of aggregate (e.g., 'TopupOrder')
   * @param data - Event data
   * @param options - Additional options
   * @returns Event ID
   */
  emit<T>(
    event: DomainEvent,
    aggregateId: string,
    aggregateType: string,
    data: T,
    options?: EmitOptions,
  ): string {
    const eventId = randomUUID();
    const payload: DomainEventPayload<T> = {
      eventType: event,
      aggregateId,
      aggregateType,
      timestamp: new Date(),
      data,
      metadata: {
        eventId,
        correlationId: options?.correlationId || eventId,
        causationId: options?.causationId,
        userId: options?.userId,
        ...options?.metadata,
      },
    };

    this.logger.debug(
      `Emitting event: ${event} for ${aggregateType}:${aggregateId}`,
    );

    // Store in history
    this.addToHistory(aggregateId, payload);

    // Emit synchronously first for critical handlers
    this.emitter.emit(event, payload);

    // Also emit with wildcard patterns
    const [domain, ...rest] = event.split('.');
    if (rest.length > 0) {
      this.emitter.emit(`${domain}.*`, payload);
    }

    return eventId;
  }

  /**
   * Emit event and wait for all handlers to complete
   */
  async emitAsync<T>(
    event: DomainEvent,
    aggregateId: string,
    aggregateType: string,
    data: T,
    options?: EmitOptions,
  ): Promise<string> {
    const eventId = randomUUID();
    const payload: DomainEventPayload<T> = {
      eventType: event,
      aggregateId,
      aggregateType,
      timestamp: new Date(),
      data,
      metadata: {
        eventId,
        correlationId: options?.correlationId || eventId,
        causationId: options?.causationId,
        userId: options?.userId,
        ...options?.metadata,
      },
    };

    this.logger.debug(
      `Emitting async event: ${event} for ${aggregateType}:${aggregateId}`,
    );

    this.addToHistory(aggregateId, payload);

    await this.emitter.emitAsync(event, payload);

    return eventId;
  }

  /**
   * Subscribe to an event
   * @param event - Event type or wildcard pattern
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<T>(event: DomainEvent | string, handler: EventHandler<T>): () => void {
    const wrappedHandler = async (payload: DomainEventPayload<T>) => {
      try {
        await handler(payload);
      } catch (error) {
        this.logger.error(
          `Error handling event ${event}: ${error}`,
          (error as Error).stack,
        );
      }
    };

    this.emitter.on(event, wrappedHandler);

    this.logger.debug(`Subscribed to event: ${event}`);

    return () => {
      this.emitter.off(event, wrappedHandler);
    };
  }

  /**
   * Subscribe to an event once
   */
  once<T>(event: DomainEvent | string, handler: EventHandler<T>): void {
    const wrappedHandler = async (payload: DomainEventPayload<T>) => {
      try {
        await handler(payload);
      } catch (error) {
        this.logger.error(
          `Error handling event ${event}: ${error}`,
          (error as Error).stack,
        );
      }
    };

    this.emitter.once(event, wrappedHandler);
  }

  /**
   * Get event history for an aggregate
   */
  getHistory(aggregateId: string): DomainEventPayload[] {
    return this.eventHistory.get(aggregateId) || [];
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: DomainEvent | string): number {
    return this.emitter.listenerCount(event);
  }

  private addToHistory(aggregateId: string, payload: DomainEventPayload): void {
    let history = this.eventHistory.get(aggregateId);
    if (!history) {
      history = [];
      this.eventHistory.set(aggregateId, history);
    }

    history.push(payload);

    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }
}
