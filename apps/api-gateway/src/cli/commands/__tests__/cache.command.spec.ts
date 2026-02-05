import { Test, TestingModule } from '@nestjs/testing';
import { CacheCommand, CacheClearCommand, CacheStatsCommand } from '../cache.command';
import { RedisService } from '../../../modules/redis/redis.service';

describe('Cache Commands', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CacheCommand', () => {
    let command: CacheCommand;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheCommand,
          {
            provide: RedisService,
            useValue: {},
          },
        ],
      }).compile();

      command = module.get<CacheCommand>(CacheCommand);
    });

    it('should print usage information', async () => {
      await command.run();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cache:clear'));
    });
  });

  describe('CacheClearCommand', () => {
    let command: CacheClearCommand;
    let mockRedis: any;

    beforeEach(async () => {
      mockRedis = {
        keys: jest.fn(),
        del: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheClearCommand,
          { provide: RedisService, useValue: mockRedis },
        ],
      }).compile();

      command = module.get<CacheClearCommand>(CacheClearCommand);
    });

    it('should parse pattern option', () => {
      expect(command.parsePattern('user:*')).toBe('user:*');
    });

    it('should parse all option', () => {
      expect(command.parseAll()).toBe(true);
    });

    it('should error when no options provided', async () => {
      await command.run([], {});
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--pattern or --all'));
    });

    it('should clear all cache entries', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.del.mockResolvedValue(1);

      await command.run([], { all: true });

      expect(mockRedis.keys).toHaveBeenCalledWith('*');
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cleared 3 cache entries'));
    });

    it('should skip lock keys when clearing all', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'lock:job1', 'key2']);
      mockRedis.del.mockResolvedValue(1);

      await command.run([], { all: true });

      expect(mockRedis.del).toHaveBeenCalledWith('key1');
      expect(mockRedis.del).toHaveBeenCalledWith('key2');
      expect(mockRedis.del).not.toHaveBeenCalledWith('lock:job1');
    });

    it('should show message when cache is empty', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await command.run([], { all: true });

      expect(console.log).toHaveBeenCalledWith('Cache is already empty');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should clear cache by pattern', async () => {
      mockRedis.keys.mockResolvedValue(['user:1', 'user:2']);
      mockRedis.del.mockResolvedValue(1);

      await command.run([], { pattern: 'user:*' });

      expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith('Cleared 2 cache entries');
    });

    it('should show message when no matching entries found', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await command.run([], { pattern: 'nonexistent:*' });

      expect(console.log).toHaveBeenCalledWith('No matching cache entries found');
    });
  });

  describe('CacheStatsCommand', () => {
    let command: CacheStatsCommand;
    let mockRedis: any;

    beforeEach(async () => {
      mockRedis = {
        keys: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheStatsCommand,
          { provide: RedisService, useValue: mockRedis },
        ],
      }).compile();

      command = module.get<CacheStatsCommand>(CacheStatsCommand);
    });

    it('should display cache statistics', async () => {
      mockRedis.keys.mockImplementation((pattern: string) => {
        const counts: Record<string, string[]> = {
          'session:*': ['session:1', 'session:2'],
          'rate:*': ['rate:1'],
          'nonce:*': [],
          'lock:*': ['lock:1', 'lock:2', 'lock:3'],
          'wallet:*': ['wallet:1'],
          'merchant:*': ['merchant:1', 'merchant:2'],
          '*': ['session:1', 'session:2', 'rate:1', 'lock:1', 'lock:2', 'lock:3', 'wallet:1', 'merchant:1', 'merchant:2'],
        };
        return Promise.resolve(counts[pattern] || []);
      });

      await command.run();

      expect(console.log).toHaveBeenCalledWith('Cache Statistics:\n');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('User sessions'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Rate limits'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total'));
    });
  });
});
