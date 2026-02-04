import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { randomUUID } from 'crypto';

export interface LockOptions {
  /** Lock TTL in milliseconds */
  ttlMs?: number;
  /** Number of retry attempts */
  retryCount?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<LockOptions> = {
  ttlMs: 30000,
  retryCount: 3,
  retryDelayMs: 100,
};

/**
 * Distributed lock service using Redis
 * Prevents race conditions in concurrent operations
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Acquire a distributed lock
   * @param key - Lock key (will be prefixed with 'lock:')
   * @param options - Lock options
   * @returns Lock ID if acquired, null if failed
   */
  async acquireLock(key: string, options?: LockOptions): Promise<string | null> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lockId = randomUUID();
    const lockKey = `lock:${key}`;

    for (let attempt = 0; attempt < opts.retryCount; attempt++) {
      try {
        const result = await this.redis.setNX(lockKey, lockId, opts.ttlMs);

        if (result) {
          this.logger.debug(`Lock acquired: ${lockKey} (id: ${lockId})`);
          return lockId;
        }

        if (attempt < opts.retryCount - 1) {
          await this.sleep(opts.retryDelayMs);
        }
      } catch (error) {
        this.logger.error(`Failed to acquire lock ${lockKey}: ${error}`);
        throw error;
      }
    }

    this.logger.warn(`Failed to acquire lock after ${opts.retryCount} attempts: ${lockKey}`);
    return null;
  }

  /**
   * Release a distributed lock
   * Uses Lua script for atomic check-and-delete
   * @param key - Lock key
   * @param lockId - Lock ID returned from acquireLock
   * @returns true if lock was released, false if lock was not held
   */
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    // Lua script ensures atomic check-and-delete
    // Only deletes if the lock is still held by the same owner
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(script, [lockKey], [lockId]);
      const released = result === 1;

      if (released) {
        this.logger.debug(`Lock released: ${lockKey} (id: ${lockId})`);
      } else {
        this.logger.warn(`Lock not released (not owned or expired): ${lockKey}`);
      }

      return released;
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}: ${error}`);
      throw error;
    }
  }

  /**
   * Extend lock TTL
   * @param key - Lock key
   * @param lockId - Lock ID
   * @param ttlMs - New TTL in milliseconds
   * @returns true if extended, false if lock not held
   */
  async extendLock(key: string, lockId: string, ttlMs: number): Promise<boolean> {
    const lockKey = `lock:${key}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(script, [lockKey], [lockId, ttlMs.toString()]);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to extend lock ${lockKey}: ${error}`);
      throw error;
    }
  }

  /**
   * Execute a function with a distributed lock
   * Automatically acquires and releases the lock
   * @param key - Lock key
   * @param fn - Function to execute while holding the lock
   * @param options - Lock options
   * @returns Result of the function
   * @throws Error if lock cannot be acquired
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const lockId = await this.acquireLock(key, options);

    if (!lockId) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, lockId);
    }
  }

  /**
   * Check if a lock is currently held
   * @param key - Lock key
   * @returns true if lock exists
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const value = await this.redis.get(lockKey);
    return value !== null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
