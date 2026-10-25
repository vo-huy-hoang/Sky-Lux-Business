import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { RedisService } from '../../common/redis/redis.service';

export type ChatEventType =
  | 'message.created'
  | 'message.deleted'
  | 'message.read'
  | 'member.joined'
  | 'member.left'
  | 'typing.start'
  | 'typing.stop'
  | 'unread_count'
  | 'conversation.updated';

export interface ChatEvent<T = any> {
  type: ChatEventType;
  organizationId: string;
  conversationId: string;
  data: T;
  senderInstanceId?: string;
  timestamp?: number;
}

export const CHAT_CHANNEL_PREFIX = 'skylux:chat:events:';
export const CHAT_CHANNEL_PATTERN = 'skylux:chat:events:*';

@Injectable()
export class ChatPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatPubSubService.name);
  public readonly instanceId: string = crypto.randomUUID();

  // Local Subject for reactive streaming on this instance
  private readonly localEvent$ = new Subject<ChatEvent>();

  // Dedicated subscriber client for ioredis (subscriber mode cannot run normal commands)
  private subscriberClient: Redis | null = null;
  private isSubscribed = false;

  constructor(
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async onModuleInit() {
    await this.initSubscriber();
  }

  async onModuleDestroy() {
    await this.closeSubscriber();
  }

  /**
   * Khởi tạo subscriber lắng nghe các sự kiện chat đa máy chủ qua Redis
   */
  async initSubscriber(customSubscriber?: Redis): Promise<void> {
    if (customSubscriber) {
      this.subscriberClient = customSubscriber;
    } else if (this.redisService) {
      this.subscriberClient = this.redisService.createSubscriberClient();
    }

    if (!this.subscriberClient) {
      this.logger.warn(
        `Redis subscriber not available. Running in local in-memory fallback mode (instanceId: ${this.instanceId}).`,
      );
      return;
    }

    try {
      this.subscriberClient.on('connect', () => {
        this.logger.log(
          `ChatPubSub subscriber connected to Redis (instanceId: ${this.instanceId})`,
        );
      });

      this.subscriberClient.on('error', (err) => {
        this.logger.warn(`ChatPubSub subscriber warning: ${err.message}`);
      });

      this.subscriberClient.on('pmessage', (_pattern, channel, messageStr) => {
        this.handleIncomingRedisMessage(channel, messageStr);
      });

      // Connect if not already connected
      if (this.subscriberClient.status === 'wait') {
        await this.subscriberClient.connect().catch((err) => {
          this.logger.warn(
            `Redis subscriber connection skipped: ${err.message}`,
          );
        });
      }

      await this.subscriberClient.psubscribe(CHAT_CHANNEL_PATTERN);
      this.isSubscribed = true;
      this.logger.log(
        `Subscribed to Redis pattern "${CHAT_CHANNEL_PATTERN}" successfully.`,
      );
    } catch (err: any) {
      this.isSubscribed = false;
      this.logger.warn(
        `Failed to subscribe to Redis: ${err.message}. Operating in local fallback mode.`,
      );
    }
  }

  /**
   * Xử lý gói tin nhận được từ Redis channel
   */
  handleIncomingRedisMessage(_channel: string, messageStr: string): void {
    try {
      const event: ChatEvent = JSON.parse(messageStr);

      // Nếu sự kiện xuất phát từ chính instance này, bỏ qua để tránh trùng lặp
      if (event.senderInstanceId === this.instanceId) {
        return;
      }

      // Đẩy vào stream cục bộ để client kết nối tới instance này nhận được qua SSE
      this.localEvent$.next(event);
    } catch (err: any) {
      this.logger.warn(
        `Failed to parse incoming Redis message: ${err.message}`,
      );
    }
  }

  /**
   * Phát đi một sự kiện chat:
   * 1. Luôn emit ngay lập tức vào local stream (zero-latency + instant fallback).
   * 2. Nếu Redis khả dụng, publish ra Redis channel để các máy chủ khác nhận được.
   */
  async publish<T = any>(
    event: Omit<ChatEvent<T>, 'senderInstanceId' | 'timestamp'>,
  ): Promise<void> {
    const fullEvent: ChatEvent<T> = {
      ...event,
      senderInstanceId: this.instanceId,
      timestamp: Date.now(),
    };

    // 1. Phát ngay cho các client nội bộ của instance này (zero-latency)
    this.localEvent$.next(fullEvent);

    // 2. Publish ra Redis channel để đồng bộ sang các instance khác trong cluster
    if (this.redisService) {
      const channel = `${CHAT_CHANNEL_PREFIX}${fullEvent.organizationId}`;
      try {
        await this.redisService.publish(channel, JSON.stringify(fullEvent));
      } catch (err: any) {
        this.logger.warn(
          `Failed to publish chat event to Redis (${channel}): ${err.message}. Local delivery succeeded.`,
        );
      }
    }
  }

  /**
   * Observable stream cho các SSE connections đăng ký
   */
  getEventStream(): Observable<ChatEvent> {
    return this.localEvent$.asObservable();
  }

  /**
   * Kiểm tra xem cơ chế Pub/Sub qua Redis có đang hoạt động hay đang fallback
   */
  isRedisActive(): boolean {
    return (
      this.isSubscribed &&
      !!this.subscriberClient &&
      (this.subscriberClient.status === 'ready' ||
        this.subscriberClient.status === 'connect')
    );
  }

  private async closeSubscriber(): Promise<void> {
    if (this.subscriberClient) {
      try {
        await this.subscriberClient.punsubscribe(CHAT_CHANNEL_PATTERN);
        await this.subscriberClient.quit();
      } catch {
        // ignore
      } finally {
        this.subscriberClient = null;
        this.isSubscribed = false;
      }
    }
  }
}
