import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const [database, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allUp = database.status === 'up' && redisHealth.status === 'up';
    const anyDown = database.status === 'down' || redisHealth.status === 'down';

    return {
      status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database,
        redis: redisHealth,
      },
    };
  }

  async getLiveness(): Promise<{ status: 'ok' }> {
    return { status: 'ok' };
  }

  async getReadiness(): Promise<{ status: 'ok' | 'not_ready'; details?: string }> {
    try {
      const health = await this.getHealth();
      if (health.status === 'unhealthy') {
        return { status: 'not_ready', details: 'One or more dependencies are down' };
      }
      return { status: 'ok' };
    } catch (error) {
      return { status: 'not_ready', details: String(error) };
    }
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
