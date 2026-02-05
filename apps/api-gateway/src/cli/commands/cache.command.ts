import { Command, CommandRunner, Option } from 'nest-commander';
import { RedisService } from '../../modules/redis/redis.service';

interface ClearCacheOptions {
  pattern?: string;
  all?: boolean;
}

@Command({
  name: 'cache',
  description: 'Cache management commands',
})
export class CacheCommand extends CommandRunner {
  constructor(private redis: RedisService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Usage: cli cache:clear [options]');
    console.log('Use --help for more information');
  }
}

@Command({
  name: 'cache:clear',
  description: 'Clear cache entries',
})
export class CacheClearCommand extends CommandRunner {
  constructor(private redis: RedisService) {
    super();
  }

  @Option({
    flags: '-p, --pattern <pattern>',
    description: 'Key pattern to clear (e.g., "user:*", "rate:*")',
  })
  parsePattern(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --all',
    description: 'Clear all cache entries (use with caution)',
    defaultValue: false,
  })
  parseAll(): boolean {
    return true;
  }

  async run(
    passedParams: string[],
    options?: ClearCacheOptions,
  ): Promise<void> {
    if (!options?.pattern && !options?.all) {
      console.error('Please specify --pattern or --all');
      return;
    }

    if (options?.all) {
      console.log('Clearing all cache entries...');
      const keys = await this.redis.keys('*');

      if (keys.length === 0) {
        console.log('Cache is already empty');
        return;
      }

      // Filter out lock keys and delete in parallel for better performance
      const keysToDelete = keys.filter((key) => !key.startsWith('lock:'));
      const BATCH_SIZE = 100;

      for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
        const batch = keysToDelete.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((key) => this.redis.del(key)));
      }

      console.log(`Cleared ${keysToDelete.length} cache entries (skipped ${keys.length - keysToDelete.length} lock keys)`);
      return;
    }

    if (options?.pattern) {
      console.log(`Clearing cache entries matching: ${options.pattern}`);
      const keys = await this.redis.keys(options.pattern);

      if (keys.length === 0) {
        console.log('No matching cache entries found');
        return;
      }

      // Delete in parallel batches for better performance
      const BATCH_SIZE = 100;
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((key) => this.redis.del(key)));
      }

      console.log(`Cleared ${keys.length} cache entries`);
    }
  }
}

@Command({
  name: 'cache:stats',
  description: 'Show cache statistics',
})
export class CacheStatsCommand extends CommandRunner {
  constructor(private redis: RedisService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Cache Statistics:\n');

    const patterns = [
      { name: 'User sessions', pattern: 'session:*' },
      { name: 'Rate limits', pattern: 'rate:*' },
      { name: 'Nonces', pattern: 'nonce:*' },
      { name: 'Locks', pattern: 'lock:*' },
      { name: 'Wallet cache', pattern: 'wallet:*' },
      { name: 'Merchant cache', pattern: 'merchant:*' },
    ];

    // Fetch all key counts in parallel for better performance
    const results = await Promise.all(
      patterns.map(async ({ name, pattern }) => ({
        name,
        count: (await this.redis.keys(pattern)).length,
      })),
    );

    let total = 0;
    for (const { name, count } of results) {
      console.log(`${name.padEnd(20)}: ${count} entries`);
      total += count;
    }

    console.log('-'.repeat(40));
    console.log(`${'Total'.padEnd(20)}: ${total} entries`);
  }
}
