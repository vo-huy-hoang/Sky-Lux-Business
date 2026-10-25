import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService - Mutex Lock & Single-Flight Cache', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'redis.host') return 'localhost';
              if (key === 'redis.port') return 6379;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    // Inject mock client and set connected state
    (service as any).client = mockRedisClient;
    (service as any).isConnected = true;
  });

  describe('setNx', () => {
    it('should return true when Redis successfully acquires lock (returns "OK")', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const acquired = await service.setNx('lock:test', '1', 5);

      expect(acquired).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:test',
        '1',
        'EX',
        5,
        'NX',
      );
    });

    it('should return false when lock already exists (Redis returns null)', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      const acquired = await service.setNx('lock:test', '1', 5);

      expect(acquired).toBe(false);
    });

    it('should return false when Redis is disconnected', async () => {
      (service as any).isConnected = false;

      const acquired = await service.setNx('lock:test', '1', 5);

      expect(acquired).toBe(false);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should return false gracefully without throwing when Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Connection dropped'));

      const acquired = await service.setNx('lock:test', '1', 5);

      expect(acquired).toBe(false);
    });
  });

  describe('getOrCompute', () => {
    it('should return cached value immediately on cache hit without executing computeFn', async () => {
      const cachedData = { revenue: 1000000, margin: 250000 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const computeFn = jest.fn();
      const result = await service.getOrCompute(
        'dashboard:test',
        computeFn,
        60,
      );

      expect(result).toEqual(cachedData);
      expect(computeFn).not.toHaveBeenCalled();
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should acquire lock, compute, cache, release lock, and return result on cache miss', async () => {
      const freshData = { revenue: 2000000, margin: 500000 };
      mockRedisClient.get.mockResolvedValue(null); // cache miss
      mockRedisClient.set.mockImplementation(
        (key: string, val: string, ...args: any[]) => {
          if (args.includes('NX')) return Promise.resolve('OK'); // lock acquired
          return Promise.resolve('OK'); // cache set
        },
      );
      mockRedisClient.del.mockResolvedValue(1);

      const computeFn = jest.fn().mockResolvedValue(freshData);
      const result = await service.getOrCompute(
        'dashboard:test',
        computeFn,
        60,
        5,
      );

      expect(result).toEqual(freshData);
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:dashboard:test',
        '1',
        'EX',
        5,
        'NX',
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'dashboard:test',
        JSON.stringify(freshData),
        'EX',
        60,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith('lock:dashboard:test');
    });

    it('should protect against Cache Stampede by executing computeFn only ONCE across concurrent requests', async () => {
      const freshData = { stats: 'realtime-kpi' };
      let lockHeld = false;
      let cachedValue: string | null = null;

      // Simulate realistic Redis behavior for concurrent callers
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key === 'dashboard:concurrent') return cachedValue;
        return null;
      });

      mockRedisClient.set.mockImplementation(
        async (key: string, val: string, ...args: any[]) => {
          if (args.includes('NX')) {
            if (!lockHeld) {
              lockHeld = true;
              return 'OK'; // Acquired lock
            }
            return null; // Lock already held by another request
          }
          if (key === 'dashboard:concurrent') {
            cachedValue = val;
          }
          return 'OK';
        },
      );

      mockRedisClient.del.mockImplementation(async (key: string) => {
        if (key === 'lock:dashboard:concurrent') {
          lockHeld = false;
        }
        return 1;
      });

      const computeFn = jest.fn().mockImplementation(async () => {
        // Small delay to simulate heavy PostgreSQL computation
        await new Promise((r) => setTimeout(r, 60));
        return freshData;
      });

      // Launch 5 concurrent calls simultaneously
      const results = await Promise.all([
        service.getOrCompute('dashboard:concurrent', computeFn, 60),
        service.getOrCompute('dashboard:concurrent', computeFn, 60),
        service.getOrCompute('dashboard:concurrent', computeFn, 60),
        service.getOrCompute('dashboard:concurrent', computeFn, 60),
        service.getOrCompute('dashboard:concurrent', computeFn, 60),
      ]);

      // All 5 callers receive the identical fresh data
      results.forEach((res) => expect(res).toEqual(freshData));

      // Heavy database computation was executed EXACTLY ONCE!
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should gracefully fallback to computeFn without throwing if Redis is disconnected', async () => {
      (service as any).isConnected = false;

      const fallbackData = { fallback: true };
      const computeFn = jest.fn().mockResolvedValue(fallbackData);

      const result = await service.getOrCompute(
        'dashboard:test',
        computeFn,
        60,
      );

      expect(result).toEqual(fallbackData);
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should ensure lock is released even if computeFn throws an exception', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK'); // lock acquired
      mockRedisClient.del.mockResolvedValue(1);

      const computeFn = jest
        .fn()
        .mockRejectedValue(new Error('Database query failure'));

      // Function catches error and falls back to computeFn (or re-throws from computeFn)
      await expect(
        service.getOrCompute('dashboard:error-test', computeFn, 60),
      ).rejects.toThrow('Database query failure');

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'lock:dashboard:error-test',
      );
    });
  });
});
