import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from '../redis/redis.service';

interface MemoryRecord {
  totalHits: number;
  expiresAt: number;
  isBlocked: boolean;
  blockedUntil: number;
}

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);
  private readonly memoryStorage = new Map<string, MemoryRecord>();

  constructor(private readonly redisService?: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `throttle:${throttlerName}:${key}`;
    const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));
    const now = Date.now();

    // 1. Phân tán trên Redis nếu có kết nối
    const client = (this.redisService as any)?.client;
    if (client && (this.redisService as any)?.isConnected) {
      try {
        const blockKey = `throttle:block:${throttlerName}:${key}`;
        const isBlocked = await client.get(blockKey);

        if (isBlocked) {
          const pttl = await client.pttl(blockKey);
          return {
            totalHits: limit + 1,
            timeToExpire: Math.max(0, pttl),
            isBlocked: true,
            timeToBlockExpire: Math.max(0, pttl),
          };
        }

        const hits = await client.incr(storageKey);
        if (hits === 1) {
          await client.expire(storageKey, ttlSeconds);
        }

        const pttl = await client.pttl(storageKey);
        const timeToExpire = Math.max(0, pttl);

        if (hits > limit) {
          if (blockDuration > 0) {
            const blockDurationSeconds = Math.max(
              1,
              Math.ceil(blockDuration / 1000),
            );
            await client.set(blockKey, '1', 'EX', blockDurationSeconds);
            return {
              totalHits: hits,
              timeToExpire: blockDuration,
              isBlocked: true,
              timeToBlockExpire: blockDuration,
            };
          }

          return {
            totalHits: hits,
            timeToExpire,
            isBlocked: true,
            timeToBlockExpire: timeToExpire,
          };
        }

        return {
          totalHits: hits,
          timeToExpire,
          isBlocked: false,
          timeToBlockExpire: 0,
        };
      } catch (err: any) {
        this.logger.warn(
          `Redis throttler error, falling back to memory: ${err.message}`,
        );
      }
    }

    // 2. In-memory Fallback (Phục vụ Unit test và khi Redis offline)
    const existing = this.memoryStorage.get(storageKey);
    if (!existing || now > existing.expiresAt) {
      const record: MemoryRecord = {
        totalHits: 1,
        expiresAt: now + ttl,
        isBlocked: false,
        blockedUntil: 0,
      };
      this.memoryStorage.set(storageKey, record);
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    existing.totalHits += 1;
    const timeToExpire = Math.max(0, existing.expiresAt - now);

    if (existing.totalHits > limit) {
      existing.isBlocked = true;
      return {
        totalHits: existing.totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: timeToExpire,
      };
    }

    return {
      totalHits: existing.totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
