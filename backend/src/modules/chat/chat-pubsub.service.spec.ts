import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import { firstValueFrom, toArray, take } from 'rxjs';
import {
  ChatPubSubService,
  ChatEvent,
  CHAT_CHANNEL_PATTERN,
  CHAT_CHANNEL_PREFIX,
} from './chat-pubsub.service';
import { RedisService } from '../../common/redis/redis.service';

describe('TICKET-CHAT-03: ChatPubSubService (Multi-server Redis Pub/Sub)', () => {
  describe('1. Local Fallback Mode (Redis Unavailable / Disconnected)', () => {
    let service: ChatPubSubService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ChatPubSubService,
          {
            provide: RedisService,
            useValue: null, // No Redis available
          },
        ],
      }).compile();

      service = module.get<ChatPubSubService>(ChatPubSubService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await service.onModuleDestroy();
    });

    it('should operate in local fallback mode without throwing', () => {
      expect(service.isRedisActive()).toBe(false);
      expect(service.instanceId).toBeDefined();
    });

    it('should deliver events to local subscriber even when Redis is absent', async () => {
      const receivedEvents: ChatEvent[] = [];
      const sub = service.getEventStream().subscribe((evt) => {
        receivedEvents.push(evt);
      });

      await service.publish({
        type: 'message.created',
        organizationId: 'org-test',
        conversationId: 'conv-123',
        data: { id: 'msg-1', content: 'Nội dung tin nhắn fallback' },
      });

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('message.created');
      expect(receivedEvents[0].data.content).toBe('Nội dung tin nhắn fallback');
      expect(receivedEvents[0].senderInstanceId).toBe(service.instanceId);

      sub.unsubscribe();
    });
  });

  describe('2. Single Instance with Redis Pub/Sub', () => {
    let service: ChatPubSubService;
    let mockRedisService: Partial<RedisService>;
    let mockSubscriber: EventEmitter & {
      status: string;
      connect: jest.Mock;
      psubscribe: jest.Mock;
      punsubscribe: jest.Mock;
      quit: jest.Mock;
    };

    beforeEach(async () => {
      mockSubscriber = Object.assign(new EventEmitter(), {
        status: 'ready',
        connect: jest.fn().mockResolvedValue(undefined),
        psubscribe: jest.fn().mockResolvedValue('OK'),
        punsubscribe: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
      });

      mockRedisService = {
        isReady: jest.fn().mockReturnValue(true),
        publish: jest.fn().mockResolvedValue(1),
        createSubscriberClient: jest.fn().mockReturnValue(mockSubscriber),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ChatPubSubService,
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
        ],
      }).compile();

      service = module.get<ChatPubSubService>(ChatPubSubService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await service.onModuleDestroy();
    });

    it('should subscribe to CHAT_CHANNEL_PATTERN on initialization', () => {
      expect(mockSubscriber.psubscribe).toHaveBeenCalledWith(
        CHAT_CHANNEL_PATTERN,
      );
      expect(service.isRedisActive()).toBe(true);
    });

    it('should publish full event with instanceId to Redis channel', async () => {
      const eventPayload = {
        type: 'typing.start' as const,
        organizationId: 'org-luxury',
        conversationId: 'conv-halong',
        data: { userId: 'user-sales-1', fullName: 'Nguyễn Sales' },
      };

      await service.publish(eventPayload);

      expect(mockRedisService.publish).toHaveBeenCalledWith(
        `${CHAT_CHANNEL_PREFIX}org-luxury`,
        expect.stringContaining('"type":"typing.start"'),
      );
      expect(mockRedisService.publish).toHaveBeenCalledWith(
        `${CHAT_CHANNEL_PREFIX}org-luxury`,
        expect.stringContaining(`"senderInstanceId":"${service.instanceId}"`),
      );
    });

    it('should ignore incoming Redis messages if senderInstanceId matches self (no duplicate)', async () => {
      const receivedEvents: ChatEvent[] = [];
      const sub = service.getEventStream().subscribe((evt) => {
        receivedEvents.push(evt);
      });

      // Simulate Redis echoing back message that was published by this same instance
      const selfEchoMessage: ChatEvent = {
        type: 'message.created',
        organizationId: 'org-luxury',
        conversationId: 'conv-halong',
        senderInstanceId: service.instanceId,
        timestamp: Date.now(),
        data: { id: 'msg-echo' },
      };

      mockSubscriber.emit(
        'pmessage',
        CHAT_CHANNEL_PATTERN,
        `${CHAT_CHANNEL_PREFIX}org-luxury`,
        JSON.stringify(selfEchoMessage),
      );

      // Should be ignored
      expect(receivedEvents).toHaveLength(0);

      sub.unsubscribe();
    });

    it('should deliver incoming Redis messages to local stream if sent by another instance', async () => {
      const receivedEvents: ChatEvent[] = [];
      const sub = service.getEventStream().subscribe((evt) => {
        receivedEvents.push(evt);
      });

      const foreignMessage: ChatEvent = {
        type: 'message.created',
        organizationId: 'org-luxury',
        conversationId: 'conv-halong',
        senderInstanceId: 'foreign-server-node-99',
        timestamp: Date.now(),
        data: { id: 'msg-foreign', content: 'Tin nhắn từ máy chủ 2' },
      };

      mockSubscriber.emit(
        'pmessage',
        CHAT_CHANNEL_PATTERN,
        `${CHAT_CHANNEL_PREFIX}org-luxury`,
        JSON.stringify(foreignMessage),
      );

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].data.content).toBe('Tin nhắn từ máy chủ 2');
      expect(receivedEvents[0].senderInstanceId).toBe('foreign-server-node-99');

      sub.unsubscribe();
    });

    it('should gracefully handle Redis publish errors without throwing', async () => {
      (mockRedisService.publish as jest.Mock).mockRejectedValueOnce(
        new Error('Redis connection severed'),
      );

      // Must not throw exception
      await expect(
        service.publish({
          type: 'message.deleted',
          organizationId: 'org-luxury',
          conversationId: 'conv-halong',
          data: { id: 'msg-to-delete' },
        }),
      ).resolves.not.toThrow();
    });

    it('should unsubscribe and quit subscriber on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockSubscriber.punsubscribe).toHaveBeenCalledWith(
        CHAT_CHANNEL_PATTERN,
      );
      expect(mockSubscriber.quit).toHaveBeenCalled();
    });
  });

  describe('3. Multi-Instance Communication Simulation (2 Backend Nodes over Redis Pub/Sub)', () => {
    // Shared simulated Redis Broker Channel
    class MockRedisClusterBroker {
      private subscribers: Array<{
        pattern: string;
        emitter: EventEmitter;
      }> = [];

      registerSubscriber(pattern: string, emitter: EventEmitter) {
        this.subscribers.push({ pattern, emitter });
      }

      publish(channel: string, message: string): number {
        let deliveredCount = 0;
        for (const sub of this.subscribers) {
          // If channel matches pattern prefix
          if (channel.startsWith(sub.pattern.replace('*', ''))) {
            sub.emitter.emit('pmessage', sub.pattern, channel, message);
            deliveredCount++;
          }
        }
        return deliveredCount;
      }
    }

    let broker: MockRedisClusterBroker;
    let nodeA: ChatPubSubService;
    let nodeB: ChatPubSubService;

    const createMockInstance = async (
      brokerRef: MockRedisClusterBroker,
    ): Promise<ChatPubSubService> => {
      const subscriberEmitter = Object.assign(new EventEmitter(), {
        status: 'ready',
        connect: jest.fn().mockResolvedValue(undefined),
        psubscribe: jest.fn().mockImplementation((pattern: string) => {
          brokerRef.registerSubscriber(pattern, subscriberEmitter);
          return Promise.resolve('OK');
        }),
        punsubscribe: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
      });

      const redisService: Partial<RedisService> = {
        isReady: () => true,
        publish: jest.fn().mockImplementation((channel, msg) => {
          return Promise.resolve(brokerRef.publish(channel, msg));
        }),
        createSubscriberClient: () => subscriberEmitter as any,
      };

      const module = await Test.createTestingModule({
        providers: [
          ChatPubSubService,
          { provide: RedisService, useValue: redisService },
        ],
      }).compile();

      const svc = module.get<ChatPubSubService>(ChatPubSubService);
      await svc.onModuleInit();
      return svc;
    };

    beforeEach(async () => {
      broker = new MockRedisClusterBroker();
      nodeA = await createMockInstance(broker);
      nodeB = await createMockInstance(broker);
    });

    afterEach(async () => {
      await nodeA.onModuleDestroy();
      await nodeB.onModuleDestroy();
    });

    it('two instances should have different unique instance IDs', () => {
      expect(nodeA.instanceId).not.toEqual(nodeB.instanceId);
    });

    it('when Node A sends a message, both Node A (locally) and Node B (via Redis) receive it with no duplicates', async () => {
      const nodeAEvents: ChatEvent[] = [];
      const nodeBEvents: ChatEvent[] = [];

      const subA = nodeA.getEventStream().subscribe((e) => nodeAEvents.push(e));
      const subB = nodeB.getEventStream().subscribe((e) => nodeBEvents.push(e));

      // Node A publishes message.created
      await nodeA.publish({
        type: 'message.created',
        organizationId: 'org-travel-01',
        conversationId: 'conv-tour-phuquoc',
        data: {
          id: 'msg-abc-123',
          content: 'Xác nhận 15 khách tour Phú Quốc',
          sender: { fullName: 'Hướng Dẫn Viên Tuấn' },
        },
      });

      // Node A receives exactly 1 event (locally emitted, echo from Redis filtered out)
      expect(nodeAEvents).toHaveLength(1);
      expect(nodeAEvents[0].data.content).toBe(
        'Xác nhận 15 khách tour Phú Quốc',
      );
      expect(nodeAEvents[0].senderInstanceId).toBe(nodeA.instanceId);

      // Node B receives the event from Node A via Redis Pub/Sub
      expect(nodeBEvents).toHaveLength(1);
      expect(nodeBEvents[0].data.content).toBe(
        'Xác nhận 15 khách tour Phú Quốc',
      );
      expect(nodeBEvents[0].senderInstanceId).toBe(nodeA.instanceId);

      subA.unsubscribe();
      subB.unsubscribe();
    });

    it('bidirectional communication: Node B can send typing event back to Node A', async () => {
      const nodeAEvents: ChatEvent[] = [];
      const nodeBEvents: ChatEvent[] = [];

      const subA = nodeA.getEventStream().subscribe((e) => nodeAEvents.push(e));
      const subB = nodeB.getEventStream().subscribe((e) => nodeBEvents.push(e));

      // Node B publishes typing.start
      await nodeB.publish({
        type: 'typing.start',
        organizationId: 'org-travel-01',
        conversationId: 'conv-tour-phuquoc',
        data: {
          userId: 'user-operator-9',
          fullName: 'Điều Hành Lan',
        },
      });

      // Node B receives locally
      expect(nodeBEvents).toHaveLength(1);
      expect(nodeBEvents[0].type).toBe('typing.start');
      expect(nodeBEvents[0].data.fullName).toBe('Điều Hành Lan');

      // Node A receives over Redis
      expect(nodeAEvents).toHaveLength(1);
      expect(nodeAEvents[0].type).toBe('typing.start');
      expect(nodeAEvents[0].data.fullName).toBe('Điều Hành Lan');
      expect(nodeAEvents[0].senderInstanceId).toBe(nodeB.instanceId);

      subA.unsubscribe();
      subB.unsubscribe();
    });

    it('multi-tenant channel isolation: events from Org A are not received by Org B listeners', async () => {
      const orgAEvents: ChatEvent[] = [];
      const orgBEvents: ChatEvent[] = [];

      // Node B only listens to Org 1
      const subA = nodeB.getEventStream().subscribe((e) => {
        if (e.organizationId === 'org-company-1') orgAEvents.push(e);
        if (e.organizationId === 'org-company-2') orgBEvents.push(e);
      });

      // Node A publishes to Org 1
      await nodeA.publish({
        type: 'message.created',
        organizationId: 'org-company-1',
        conversationId: 'conv-1',
        data: { id: 'msg-org1' },
      });

      expect(orgAEvents).toHaveLength(1);
      expect(orgBEvents).toHaveLength(0);

      subA.unsubscribe();
    });
  });
});
