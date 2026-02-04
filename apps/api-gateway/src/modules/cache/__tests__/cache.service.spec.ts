import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import { RedisService } from '../../redis/redis.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisService: any;

  beforeEach(async () => {
    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    cacheService.onModuleDestroy();
  });

  describe('get', () => {
    it('should return value from local cache (L1)', async () => {
      // Set in cache first
      await cacheService.set('test-key', { data: 'value' });

      const result = await cacheService.get('test-key');

      expect(result).toEqual({ data: 'value' });
      // Should not hit Redis since it's in local cache
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should return value from Redis (L2) if not in local cache', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({ data: 'remote' }));

      const result = await cacheService.get('test-key');

      expect(result).toEqual({ data: 'remote' });
      expect(mockRedisService.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if not in any cache', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await cacheService.get('missing-key');

      expect(result).toBeNull();
    });

    it('should populate local cache from Redis', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({ data: 'remote' }));

      // First call - goes to Redis
      await cacheService.get('test-key');

      // Second call - should be in local cache
      mockRedisService.get.mockClear();
      const result = await cacheService.get('test-key');

      expect(result).toEqual({ data: 'remote' });
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value in both L1 and L2 cache', async () => {
      await cacheService.set('test-key', { data: 'value' });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        CACHE_TTL.DEFAULT,
      );

      // Verify L1 cache
      const cached = await cacheService.get('test-key');
      expect(cached).toEqual({ data: 'value' });
    });

    it('should use custom TTL', async () => {
      await cacheService.set('test-key', { data: 'value' }, { ttl: 60 });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        60,
      );
    });

    it('should skip local cache when specified', async () => {
      await cacheService.set('test-key', { data: 'value' }, { skipLocal: true });

      // L1 should be empty
      mockRedisService.get.mockResolvedValue(null);
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should skip remote cache when specified', async () => {
      await cacheService.set('test-key', { data: 'value' }, { skipRemote: true });

      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await cacheService.set('test-key', { data: 'cached' });

      const factory = jest.fn().mockResolvedValue({ data: 'new' });
      const result = await cacheService.getOrSet('test-key', factory);

      expect(result).toEqual({ data: 'cached' });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should execute factory and cache result if not exists', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const factory = jest.fn().mockResolvedValue({ data: 'new' });
      const result = await cacheService.getOrSet('test-key', factory);

      expect(result).toEqual({ data: 'new' });
      expect(factory).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should delete from both L1 and L2 cache', async () => {
      await cacheService.set('test-key', { data: 'value' });
      await cacheService.del('test-key');

      expect(mockRedisService.del).toHaveBeenCalledWith('test-key');

      // Verify L1 is cleared
      mockRedisService.get.mockResolvedValue(null);
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate matching keys', async () => {
      await cacheService.set('merchant:123:config', { data: '1' });
      await cacheService.set('merchant:123:orders', { data: '2' });
      await cacheService.set('other:key', { data: '3' });

      mockRedisService.keys.mockResolvedValue([
        'merchant:123:config',
        'merchant:123:orders',
      ]);

      await cacheService.invalidatePattern('merchant:123');

      expect(mockRedisService.keys).toHaveBeenCalledWith('*merchant:123*');
      expect(mockRedisService.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('CACHE_KEYS', () => {
    it('should generate correct cache keys', () => {
      expect(CACHE_KEYS.MERCHANT_CONFIG('M123')).toBe('merchant:config:M123');
      expect(CACHE_KEYS.MERCHANT_BY_CODE('M12345')).toBe('merchant:code:M12345');
      expect(CACHE_KEYS.SYSTEM_SETTING('rate')).toBe('system:setting:rate');
      expect(CACHE_KEYS.EXCHANGE_RATE).toBe('system:exchange_rate');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      const stats = cacheService.getStats();

      expect(stats.localSize).toBe(2);
      expect(stats.localMaxSize).toBe(1000);
    });
  });
});
