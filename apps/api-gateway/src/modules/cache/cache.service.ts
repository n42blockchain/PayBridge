import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { RedisService } from '../redis/redis.service';

/**
 * Cache key patterns for different data types
 */
export const CACHE_KEYS = {
  MERCHANT_CONFIG: (merchantId: string) => `merchant:config:${merchantId}`,
  MERCHANT_BY_CODE: (code: string) => `merchant:code:${code}`,
  EXCHANGE_RATE: 'system:exchange_rate',
  TOPUP_CHANNELS: 'channels:topup:enabled',
  SETTLEMENT_CHANNELS: 'channels:settlement:enabled',
  AUDIT_THRESHOLDS: 'system:audit_thresholds',
  SYSTEM_SETTING: (key: string) => `system:setting:${key}`,
} as const;

/**
 * Default TTL values in seconds
 */
export const CACHE_TTL = {
  MERCHANT_CONFIG: 300,      // 5 minutes
  EXCHANGE_RATE: 60,         // 1 minute
  CHANNELS: 60,              // 1 minute
  AUDIT_THRESHOLDS: 600,     // 10 minutes
  SYSTEM_SETTING: 300,       // 5 minutes
  DEFAULT: 300,              // 5 minutes
} as const;

interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Skip local cache */
  skipLocal?: boolean;
  /** Skip remote cache */
  skipRemote?: boolean;
}

/**
 * Multi-level cache service
 * L1: In-memory LRU cache (fast, per-instance)
 * L2: Redis cache (shared across instances)
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly localCache: LRUCache<string, object>;

  constructor(private readonly redis: RedisService) {
    this.localCache = new LRUCache({
      max: 1000,
      ttl: 60 * 1000, // 1 minute default for local cache
      updateAgeOnGet: true,
    });
  }

  onModuleDestroy() {
    this.localCache.clear();
  }

  /**
   * Get value from cache (L1 first, then L2)
   */
  async get<T>(key: string): Promise<T | null> {
    // L1: Check local cache first
    const local = this.localCache.get(key) as unknown as T | undefined;
    if (local !== undefined) {
      this.logger.debug(`Cache hit (L1): ${key}`);
      return local;
    }

    // L2: Check Redis cache
    try {
      const remote = await this.redis.get(key);
      if (remote) {
        const data = JSON.parse(remote) as T;
        // Populate local cache
        this.localCache.set(key, data as object);
        this.logger.debug(`Cache hit (L2): ${key}`);
        return data;
      }
    } catch (error) {
      this.logger.warn(`Redis cache error for ${key}: ${error}`);
    }

    this.logger.debug(`Cache miss: ${key}`);
    return null;
  }

  /**
   * Set value in cache (both L1 and L2)
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<void> {
    const ttl = options?.ttl ?? CACHE_TTL.DEFAULT;

    // L1: Set local cache
    if (!options?.skipLocal) {
      this.localCache.set(key, value as object, { ttl: ttl * 1000 });
    }

    // L2: Set Redis cache
    if (!options?.skipRemote) {
      try {
        await this.redis.set(key, JSON.stringify(value), ttl);
      } catch (error) {
        this.logger.warn(`Failed to set Redis cache for ${key}: ${error}`);
      }
    }

    this.logger.debug(`Cache set: ${key} (ttl: ${ttl}s)`);
  }

  /**
   * Get or set pattern - returns cached value or executes factory
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete from cache
   */
  async del(key: string): Promise<void> {
    this.localCache.delete(key);
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Failed to delete Redis cache for ${key}: ${error}`);
    }
    this.logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear matching local cache entries
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }

    // Clear matching Redis entries
    try {
      const keys = await this.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        for (const key of keys) {
          await this.redis.del(key);
        }
        this.logger.debug(`Invalidated ${keys.length} keys matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate Redis pattern ${pattern}: ${error}`);
    }
  }

  /**
   * Invalidate all merchant-related cache
   */
  async invalidateMerchant(merchantId: string): Promise<void> {
    await this.invalidatePattern(`merchant:${merchantId}`);
    await this.del(CACHE_KEYS.MERCHANT_CONFIG(merchantId));
  }

  /**
   * Invalidate channel cache
   */
  async invalidateChannels(): Promise<void> {
    await this.del(CACHE_KEYS.TOPUP_CHANNELS);
    await this.del(CACHE_KEYS.SETTLEMENT_CHANNELS);
  }

  /**
   * Invalidate system settings cache
   */
  async invalidateSystemSetting(key: string): Promise<void> {
    await this.del(CACHE_KEYS.SYSTEM_SETTING(key));
    if (key === 'topup.exchange_rate' || key === 'settlement.exchange_rate') {
      await this.del(CACHE_KEYS.EXCHANGE_RATE);
    }
    if (key === 'settlement.audit_levels') {
      await this.del(CACHE_KEYS.AUDIT_THRESHOLDS);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.localCache.clear();
    this.logger.warn('Local cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    localSize: number;
    localMaxSize: number;
  } {
    return {
      localSize: this.localCache.size,
      localMaxSize: this.localCache.max,
    };
  }
}
