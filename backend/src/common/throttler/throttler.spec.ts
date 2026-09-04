import { HttpStatus, HttpException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';
import { CustomThrottlerGuard } from './custom-throttler.guard';

describe('Phase 24: Distributed Throttler & Auth Shield', () => {
  describe('ThrottlerStorageRedisService (Memory Fallback & Resilience)', () => {
    let storage: ThrottlerStorageRedisService;

    beforeEach(() => {
      // Initialize with no RedisService to test in-memory fallback
      storage = new ThrottlerStorageRedisService(undefined);
    });

    it('should track hits and allow requests within limit', async () => {
      const key = 'test-client-ip-1';
      const ttl = 60000;
      const limit = 5;

      const record1 = await storage.increment(key, ttl, limit, 0, 'auth');
      expect(record1.totalHits).toBe(1);
      expect(record1.isBlocked).toBe(false);
      expect(record1.timeToExpire).toBeGreaterThan(0);

      const record2 = await storage.increment(key, ttl, limit, 0, 'auth');
      expect(record2.totalHits).toBe(2);
      expect(record2.isBlocked).toBe(false);
    });

    it('should block requests when exceeding limit', async () => {
      const key = 'test-client-ip-blocked';
      const ttl = 60000;
      const limit = 3;

      await storage.increment(key, ttl, limit, 0, 'auth'); // 1
      await storage.increment(key, ttl, limit, 0, 'auth'); // 2
      await storage.increment(key, ttl, limit, 0, 'auth'); // 3

      const blockedRecord = await storage.increment(key, ttl, limit, 0, 'auth'); // 4 > 3
      expect(blockedRecord.totalHits).toBe(4);
      expect(blockedRecord.isBlocked).toBe(true);
      expect(blockedRecord.timeToExpire).toBeGreaterThan(0);
    });

    it('should use Redis atomic incr when Redis is connected', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        pttl: jest.fn().mockResolvedValue(59000),
      };

      const mockRedisService = {
        client: mockRedisClient,
        isConnected: true,
      } as any;

      const redisStorage = new ThrottlerStorageRedisService(mockRedisService);
      const res = await redisStorage.increment(
        'user-key-1',
        60000,
        5,
        0,
        'auth',
      );

      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        'throttle:auth:user-key-1',
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'throttle:auth:user-key-1',
        60,
      );
      expect(res.totalHits).toBe(1);
      expect(res.isBlocked).toBe(false);
    });
  });

  describe('CustomThrottlerGuard (IP + Email Tracker & Friendly Error)', () => {
    let guard: CustomThrottlerGuard;
    let reflector: Reflector;
    let storage: ThrottlerStorageRedisService;

    beforeEach(async () => {
      storage = new ThrottlerStorageRedisService(undefined);
      reflector = new Reflector();
      guard = new CustomThrottlerGuard(
        { throttlers: [{ name: 'auth', limit: 5, ttl: 60000 }] },
        storage,
        reflector,
      );
      await guard.onModuleInit();
    });

    it('should track IP only when request does not have email in body', async () => {
      const req = {
        headers: { 'x-forwarded-for': '203.113.131.1' },
        ip: '127.0.0.1',
        body: {},
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('203.113.131.1');
    });

    it('should combine IP and normalized email when logging in', async () => {
      const req = {
        headers: { 'x-forwarded-for': '203.113.131.1, 10.0.0.1' },
        body: { email: '  Admin@SkyLux.VN ' },
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('203.113.131.1:admin@skylux.vn');
    });

    it('should throw 429 HttpException with lockoutSeconds and Vietnamese message', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {}, body: {} }),
          getResponse: () => ({ header: jest.fn() }),
        }),
      } as unknown as ExecutionContext;

      const detail = {
        totalHits: 6,
        timeToExpire: 45000, // 45 seconds
        isBlocked: true,
        timeToBlockExpire: 45000,
        limit: 5,
        ttl: 60000,
        key: 'auth:key',
        tracker: 'ip:email',
      };

      try {
        await (guard as any).throwThrottlingException(mockContext, detail);
        fail('Should have thrown HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = err.getResponse();
        expect(response.statusCode).toBe(429);
        expect(response.lockoutSeconds).toBe(45);
        expect(response.message).toContain('45 giây');
      }
    });

    it('should bypass auth throttler when endpoint does not have @Throttle auth metadata', async () => {
      const mockContext = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getClass: jest.fn().mockReturnValue(class MockController {}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: {}, body: {} }),
          getResponse: () => ({ header: jest.fn() }),
        }),
      } as unknown as ExecutionContext;

      // Reflector returns undefined for THROTTLER_LIMIT + 'auth'
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const requestProps: any = {
        context: mockContext,
        limit: 5,
        ttl: 60000,
        throttler: { name: 'auth', limit: 5, ttl: 60000 },
        blockDuration: 0,
        getTracker: jest.fn().mockResolvedValue('127.0.0.1'),
        generateKey: jest.fn().mockReturnValue('auth:127.0.0.1'),
      };

      const result = await (guard as any).handleRequest(requestProps);
      expect(result).toBe(true);
    });

    it('should enforce auth throttler when endpoint has @Throttle auth metadata', async () => {
      const mockContext = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getClass: jest.fn().mockReturnValue(class MockController {}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: {}, body: {}, ip: '127.0.0.1' }),
          getResponse: () => ({ header: jest.fn() }),
        }),
      } as unknown as ExecutionContext;

      // Reflector returns 5 for THROTTLER_LIMIT + 'auth'
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(5);

      const requestProps: any = {
        context: mockContext,
        limit: 5,
        ttl: 60000,
        throttler: { name: 'auth', limit: 5, ttl: 60000 },
        blockDuration: 0,
        getTracker: jest.fn().mockResolvedValue('127.0.0.1'),
        generateKey: jest.fn().mockReturnValue('auth:127.0.0.1'),
      };

      const result = await (guard as any).handleRequest(requestProps);
      expect(result).toBe(true);
    });
  });
});
