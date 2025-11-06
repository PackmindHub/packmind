import {
  createSSESubscriptionMessage,
  createSSEEventMessage,
  serializeSSERedisMessage,
  deserializeSSERedisMessage,
  isSSESubscriptionMessage,
  isSSEEventMessage,
  SSE_REDIS_CHANNELS,
} from './types';

describe('SSE Redis Types', () => {
  describe('SSE_REDIS_CHANNELS', () => {
    it('defines correct channel names', () => {
      expect(SSE_REDIS_CHANNELS.SUBSCRIPTIONS).toBe('sse:subscriptions');
      expect(SSE_REDIS_CHANNELS.EVENTS).toBe('sse:events');
    });
  });

  describe('createSSESubscriptionMessage', () => {
    it('creates a valid subscription message', () => {
      const message = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );

      expect(message).toEqual({
        userId: 'user123',
        action: 'subscribe',
        eventType: 'program_status',
        params: ['prog-456'],
        timestamp: expect.any(String),
      });

      // Verify timestamp is a valid ISO string
      expect(() => new Date(message.timestamp)).not.toThrow();
    });

    it('handles empty params array', () => {
      const message = createSSESubscriptionMessage(
        'user123',
        'unsubscribe',
        'notifications',
      );

      expect(message.params).toEqual([]);
    });
  });

  describe('createSSEEventMessage', () => {
    it('creates a valid event message without target users', () => {
      const eventData = { programId: 'prog-123', status: 'SUCCESS' };
      const message = createSSEEventMessage(
        'program_status',
        ['prog-123'],
        eventData,
      );

      expect(message).toEqual({
        eventType: 'program_status',
        params: ['prog-123'],
        data: eventData,
        targetUserIds: undefined,
        timestamp: expect.any(String),
      });
    });

    it('creates a valid event message with target users', () => {
      const eventData = { message: 'Hello World' };
      const targetUsers = ['user1', 'user2'];
      const message = createSSEEventMessage(
        'hello_world',
        [],
        eventData,
        targetUsers,
      );

      expect(message.targetUserIds).toEqual(targetUsers);
    });
  });

  describe('type guards', () => {
    it('correctly identifies subscription messages', () => {
      const subscriptionMessage = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );
      const eventMessage = createSSEEventMessage(
        'program_status',
        ['prog-456'],
        { status: 'SUCCESS' },
      );

      expect(isSSESubscriptionMessage(subscriptionMessage)).toBe(true);
      expect(isSSESubscriptionMessage(eventMessage)).toBe(false);
    });

    it('correctly identifies event messages', () => {
      const subscriptionMessage = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );
      const eventMessage = createSSEEventMessage(
        'program_status',
        ['prog-456'],
        { status: 'SUCCESS' },
      );

      expect(isSSEEventMessage(eventMessage)).toBe(true);
      expect(isSSEEventMessage(subscriptionMessage)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('serializes and deserializes subscription messages correctly', () => {
      const original = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );

      const serialized = serializeSSERedisMessage(original);
      const deserialized = deserializeSSERedisMessage(serialized);

      expect(deserialized).toEqual(original);
      expect(isSSESubscriptionMessage(deserialized)).toBe(true);
    });

    it('serializes and deserializes event messages correctly', () => {
      const original = createSSEEventMessage(
        'program_status',
        ['prog-456'],
        { status: 'SUCCESS', progress: 1.0 },
        ['user123'],
      );

      const serialized = serializeSSERedisMessage(original);
      const deserialized = deserializeSSERedisMessage(serialized);

      expect(deserialized).toEqual(original);
      expect(isSSEEventMessage(deserialized)).toBe(true);
    });
  });

  describe('deserialization validation', () => {
    it('throws for invalid JSON', () => {
      expect(() => {
        deserializeSSERedisMessage('invalid json');
      }).toThrow('Failed to deserialize SSE Redis message');
    });

    it('throws for non-object values', () => {
      expect(() => {
        deserializeSSERedisMessage('"just a string"');
      }).toThrow('Invalid message format: not an object');
    });

    it('throws for missing timestamp', () => {
      expect(() => {
        deserializeSSERedisMessage(
          '{"userId": "user123", "action": "subscribe"}',
        );
      }).toThrow('Invalid message format: missing or invalid timestamp');
    });

    it('throws for invalid subscription message format', () => {
      expect(() => {
        deserializeSSERedisMessage(
          JSON.stringify({
            action: 'subscribe',
            timestamp: new Date().toISOString(),
            // missing userId
          }),
        );
      }).toThrow('Invalid subscription message: missing or invalid userId');

      expect(() => {
        deserializeSSERedisMessage(
          JSON.stringify({
            userId: 'user123',
            action: 'invalid_action',
            eventType: 'test',
            params: [],
            timestamp: new Date().toISOString(),
          }),
        );
      }).toThrow(
        'Invalid subscription message: action must be subscribe or unsubscribe',
      );
    });

    it('throws for invalid event message format', () => {
      expect(() => {
        deserializeSSERedisMessage(
          JSON.stringify({
            data: { test: true },
            timestamp: new Date().toISOString(),
            // missing eventType
          }),
        );
      }).toThrow('Invalid event message: missing or invalid eventType');

      expect(() => {
        deserializeSSERedisMessage(
          JSON.stringify({
            eventType: 'test',
            params: 'not an array',
            data: { test: true },
            timestamp: new Date().toISOString(),
          }),
        );
      }).toThrow('Invalid event message: params must be an array');
    });
  });
});
