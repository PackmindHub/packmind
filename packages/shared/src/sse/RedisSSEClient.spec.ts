import { RedisSSEClient } from './RedisSSEClient';
import {
  SSE_REDIS_CHANNELS,
  createSSESubscriptionMessage,
  serializeSSERedisMessage,
} from './types';

// Mock Configuration to avoid dependency on actual Redis during tests
jest.mock('../config/config/Configuration', () => ({
  Configuration: {
    getConfig: jest.fn().mockImplementation((key: string) => {
      const mockConfig: Record<string, string> = {
        REDIS_URI: 'redis:6379',
      };
      return Promise.resolve(mockConfig[key] || null);
    }),
  },
}));

// Mock ioredis to avoid actual Redis connections during tests
const mockRedisInstance = {
  ping: jest.fn().mockResolvedValue('PONG'),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(true),
  unsubscribe: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockReturnValue(undefined),
  on: jest.fn(),
  status: 'ready',
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('RedisSSEClient', () => {
  let client: RedisSSEClient;

  beforeEach(() => {
    // Reset singleton instance before each test
    (
      RedisSSEClient as unknown as { instance: RedisSSEClient | undefined }
    ).instance = undefined;
    client = RedisSSEClient.getInstance();

    // Reset publish mock
    mockRedisInstance.publish = jest.fn().mockResolvedValue(1);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const client1 = RedisSSEClient.getInstance();
      const client2 = RedisSSEClient.getInstance();

      expect(client1).toBe(client2);
    });
  });

  describe('publish', () => {
    it('publishes a message to a Redis channel', async () => {
      const testMessage = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );
      const serializedMessage = serializeSSERedisMessage(testMessage);

      const subscriberCount = await client.publish(
        SSE_REDIS_CHANNELS.SUBSCRIPTIONS,
        serializedMessage,
      );

      expect(subscriberCount).toBe(1);
      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        SSE_REDIS_CHANNELS.SUBSCRIPTIONS,
        serializedMessage,
      );
    });
  });

  describe('subscribe', () => {
    it('subscribes to a Redis channel and sets up message callback', async () => {
      const mockCallback = jest.fn();

      await client.subscribe(SSE_REDIS_CHANNELS.EVENTS, mockCallback);

      // Verify subscribe was called
      expect(mockRedisInstance.subscribe).toHaveBeenCalledWith(
        SSE_REDIS_CHANNELS.EVENTS,
      );
      expect(mockRedisInstance.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes from a Redis channel', async () => {
      // Initialize the client first by calling a method that initializes Redis connections
      await client.publish(SSE_REDIS_CHANNELS.EVENTS, 'init');

      await client.unsubscribe(SSE_REDIS_CHANNELS.EVENTS);

      expect(mockRedisInstance.unsubscribe).toHaveBeenCalledWith(
        SSE_REDIS_CHANNELS.EVENTS,
      );
    });
  });

  describe('connection management', () => {
    it('reports connected status for ready clients', async () => {
      // Initialize by calling a method
      await client.publish(SSE_REDIS_CHANNELS.SUBSCRIPTIONS, 'test');

      expect(client.isConnected()).toBe(true);
    });

    it('disconnects both publisher and subscriber clients', async () => {
      // Initialize by calling a method
      await client.publish(SSE_REDIS_CHANNELS.SUBSCRIPTIONS, 'test');

      await client.disconnect();

      expect(mockRedisInstance.disconnect).toHaveBeenCalledTimes(2); // Once for publisher, once for subscriber
    });
  });

  describe('port parsing', () => {
    describe('when port configuration is invalid', () => {
      it('uses default port', async () => {
        const { Configuration } = jest.requireMock(
          '../config/config/Configuration',
        );
        Configuration.getConfig.mockImplementation((key: string) => {
          if (key === 'REDIS_PORT') return Promise.resolve('invalid');
          return Promise.resolve('localhost');
        });

        // Reset instance to test with new config
        (
          RedisSSEClient as unknown as { instance: RedisSSEClient | undefined }
        ).instance = undefined;
        const newClient = RedisSSEClient.getInstance();

        // This should not throw and should use default port
        await expect(
          newClient.publish('test', 'message'),
        ).resolves.toBeDefined();
      });
    });
  });
});
