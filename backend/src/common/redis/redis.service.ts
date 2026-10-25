import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const host = this.configService.get<string>('redis.host', 'localhost');
      const port = this.configService.get<number>('redis.port', 6379);

      this.client = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning: ${err.message}`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Redis not available at startup: ${err.message}`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Redis init skipped: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        // ignore
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 60): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const payload = JSON.stringify(value);
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } catch (err) {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (err) {
      // ignore
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      // ignore
    }
  }

  /**
   * Set key with NX (only if it does not exist) and TTL expiration in seconds.
   * Returns true if lock was acquired, false otherwise.
   */
  async setNx(key: string, value = '1', ttlSeconds = 5): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const res = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err: any) {
      this.logger.warn(`setNx error on key ${key}: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Single-flight atomic caching with distributed mutex locking.
   * Protects backend databases from Cache Stampede (Thundering Herd) when keys expire or are purged.
   *
   * @param key Redis cache key
   * @param computeFn Async function executing the heavy query/computation on cache miss
   * @param ttlSeconds Cache Time-To-Live in seconds (default 60s)
   * @param lockTtlSeconds Distributed mutex lock auto-release safety timeout in seconds (default 5s)
   */
  async getOrCompute<T = any>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds = 60,
    lockTtlSeconds = 5,
  ): Promise<T> {
    if (!this.client || !this.isConnected) {
      return computeFn();
    }

    try {
      const cached = await this.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }

      const lockKey = `lock:${key}`;
      const lockAcquired = await this.setNx(lockKey, '1', lockTtlSeconds);

      if (lockAcquired) {
        try {
          const doubleCheck = await this.get<T>(key);
          if (doubleCheck !== null && doubleCheck !== undefined) {
            return doubleCheck;
          }

          const result = await computeFn();
          await this.set(key, result, ttlSeconds);
          return result;
        } finally {
          await this.del(lockKey);
        }
      }

      // Lock not acquired: wait in short poll loop for the holder to compute and cache
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const retryCached = await this.get<T>(key);
        if (retryCached !== null && retryCached !== undefined) {
          return retryCached;
        }
      }

      // Safety fallback if lock holder timed out or delayed
      return computeFn();
    } catch (err: any) {
      this.logger.warn(
        `getOrCompute fallback for key ${key}: ${err?.message || err}`,
      );
      return computeFn();
    }
  }

  isReady(): boolean {
    return this.isConnected && !!this.client;
  }

  getClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  createSubscriberClient(): Redis | null {
    try {
      const host = this.configService.get<string>('redis.host', 'localhost');
      const port = this.configService.get<number>('redis.port', 6379);

      return new Redis({
        host,
        port,
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 5) return null;
          return Math.min(times * 100, 1000);
        },
      });
    } catch (err: any) {
      this.logger.warn(
        `Failed to create Redis subscriber client: ${err.message}`,
      );
      return null;
    }
  }

  async publish(channel: string, message: string): Promise<number | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.publish(channel, message);
    } catch (err: any) {
      this.logger.warn(`Redis publish failed on ${channel}: ${err.message}`);
      return null;
    }
  }
}
