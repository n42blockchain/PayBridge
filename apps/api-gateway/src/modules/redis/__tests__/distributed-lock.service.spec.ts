import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from '../distributed-lock.service';
import { RedisService } from '../redis.service';

describe('DistributedLockService', () => {
  let lockService: DistributedLockService;
  let mockRedisService: any;

  beforeEach(async () => {
    mockRedisService = {
      setNX: jest.fn(),
      eval: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    lockService = module.get<DistributedLockService>(DistributedLockService);
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      mockRedisService.setNX.mockResolvedValue(true);

      const lockId = await lockService.acquireLock('test-key');

      expect(lockId).toBeTruthy();
      expect(mockRedisService.setNX).toHaveBeenCalledWith(
        'lock:test-key',
        expect.any(String),
        30000,
      );
    });

    it('should return null when lock is already held', async () => {
      mockRedisService.setNX.mockResolvedValue(false);

      const lockId = await lockService.acquireLock('test-key', { retryCount: 1 });

      expect(lockId).toBeNull();
    });

    it('should retry on failure', async () => {
      mockRedisService.setNX
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const lockId = await lockService.acquireLock('test-key', {
        retryCount: 3,
        retryDelayMs: 10,
      });

      expect(lockId).toBeTruthy();
      expect(mockRedisService.setNX).toHaveBeenCalledTimes(3);
    });

    it('should use custom TTL', async () => {
      mockRedisService.setNX.mockResolvedValue(true);

      await lockService.acquireLock('test-key', { ttlMs: 60000 });

      expect(mockRedisService.setNX).toHaveBeenCalledWith(
        'lock:test-key',
        expect.any(String),
        60000,
      );
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      mockRedisService.eval.mockResolvedValue(1);

      const result = await lockService.releaseLock('test-key', 'lock-id-123');

      expect(result).toBe(true);
      expect(mockRedisService.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get"'),
        ['lock:test-key'],
        ['lock-id-123'],
      );
    });

    it('should return false when lock is not held', async () => {
      mockRedisService.eval.mockResolvedValue(0);

      const result = await lockService.releaseLock('test-key', 'wrong-lock-id');

      expect(result).toBe(false);
    });
  });

  describe('extendLock', () => {
    it('should extend lock TTL', async () => {
      mockRedisService.eval.mockResolvedValue(1);

      const result = await lockService.extendLock('test-key', 'lock-id', 60000);

      expect(result).toBe(true);
    });

    it('should return false when lock is not held', async () => {
      mockRedisService.eval.mockResolvedValue(0);

      const result = await lockService.extendLock('test-key', 'wrong-id', 60000);

      expect(result).toBe(false);
    });
  });

  describe('withLock', () => {
    it('should execute function with lock', async () => {
      mockRedisService.setNX.mockResolvedValue(true);
      mockRedisService.eval.mockResolvedValue(1);

      const fn = jest.fn().mockResolvedValue('result');
      const result = await lockService.withLock('test-key', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(mockRedisService.eval).toHaveBeenCalled(); // Lock released
    });

    it('should release lock even if function throws', async () => {
      mockRedisService.setNX.mockResolvedValue(true);
      mockRedisService.eval.mockResolvedValue(1);

      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(lockService.withLock('test-key', fn)).rejects.toThrow('Test error');
      expect(mockRedisService.eval).toHaveBeenCalled(); // Lock released
    });

    it('should throw when lock cannot be acquired', async () => {
      mockRedisService.setNX.mockResolvedValue(false);

      const fn = jest.fn();

      await expect(
        lockService.withLock('test-key', fn, { retryCount: 1 }),
      ).rejects.toThrow('Failed to acquire lock');
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('isLocked', () => {
    it('should return true when lock exists', async () => {
      mockRedisService.get.mockResolvedValue('some-lock-id');

      const result = await lockService.isLocked('test-key');

      expect(result).toBe(true);
    });

    it('should return false when lock does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await lockService.isLocked('test-key');

      expect(result).toBe(false);
    });
  });
});
