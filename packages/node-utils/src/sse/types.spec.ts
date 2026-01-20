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
    it('defines subscriptions channel name', () => {
      expect(SSE_REDIS_CHANNELS.SUBSCRIPTIONS).toBe('sse:subscriptions');
    });

    it('defines events channel name', () => {
      expect(SSE_REDIS_CHANNELS.EVENTS).toBe('sse:events');
    });
  });

  describe('createSSESubscriptionMessage', () => {
    describe('when creating a subscription message', () => {
      const message = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );

      it('includes the userId', () => {
        expect(message.userId).toBe('user123');
      });

      it('includes the action', () => {
        expect(message.action).toBe('subscribe');
      });

      it('includes the eventType', () => {
        expect(message.eventType).toBe('program_status');
      });

      it('includes the params', () => {
        expect(message.params).toEqual(['prog-456']);
      });

      it('includes a valid ISO timestamp', () => {
        expect(() => new Date(message.timestamp)).not.toThrow();
      });
    });

    describe('when params are not provided', () => {
      it('defaults to empty array', () => {
        const message = createSSESubscriptionMessage(
          'user123',
          'unsubscribe',
          'notifications',
        );

        expect(message.params).toEqual([]);
      });
    });
  });

  describe('createSSEEventMessage', () => {
    describe('when creating an event without target users', () => {
      const eventData = { programId: 'prog-123', status: 'SUCCESS' };
      const message = createSSEEventMessage(
        'program_status',
        ['prog-123'],
        eventData,
      );

      it('includes the eventType', () => {
        expect(message.eventType).toBe('program_status');
      });

      it('includes the params', () => {
        expect(message.params).toEqual(['prog-123']);
      });

      it('includes the data', () => {
        expect(message.data).toEqual(eventData);
      });

      it('has undefined targetUserIds', () => {
        expect(message.targetUserIds).toBeUndefined();
      });

      it('includes a timestamp', () => {
        expect(message.timestamp).toBeDefined();
      });
    });

    describe('when creating an event with target users', () => {
      it('includes the targetUserIds', () => {
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
  });

  describe('type guards', () => {
    describe('isSSESubscriptionMessage', () => {
      it('returns true for subscription messages', () => {
        const subscriptionMessage = createSSESubscriptionMessage(
          'user123',
          'subscribe',
          'program_status',
          ['prog-456'],
        );

        expect(isSSESubscriptionMessage(subscriptionMessage)).toBe(true);
      });

      it('returns false for event messages', () => {
        const eventMessage = createSSEEventMessage(
          'program_status',
          ['prog-456'],
          { status: 'SUCCESS' },
        );

        expect(isSSESubscriptionMessage(eventMessage)).toBe(false);
      });
    });

    describe('isSSEEventMessage', () => {
      it('returns true for event messages', () => {
        const eventMessage = createSSEEventMessage(
          'program_status',
          ['prog-456'],
          { status: 'SUCCESS' },
        );

        expect(isSSEEventMessage(eventMessage)).toBe(true);
      });

      it('returns false for subscription messages', () => {
        const subscriptionMessage = createSSESubscriptionMessage(
          'user123',
          'subscribe',
          'program_status',
          ['prog-456'],
        );

        expect(isSSEEventMessage(subscriptionMessage)).toBe(false);
      });
    });
  });

  describe('serialization', () => {
    describe('when serializing subscription messages', () => {
      const original = createSSESubscriptionMessage(
        'user123',
        'subscribe',
        'program_status',
        ['prog-456'],
      );
      const serialized = serializeSSERedisMessage(original);
      const deserialized = deserializeSSERedisMessage(serialized);

      it('preserves the message content', () => {
        expect(deserialized).toEqual(original);
      });

      it('maintains subscription message type', () => {
        expect(isSSESubscriptionMessage(deserialized)).toBe(true);
      });
    });

    describe('when serializing event messages', () => {
      const original = createSSEEventMessage(
        'program_status',
        ['prog-456'],
        { status: 'SUCCESS', progress: 1.0 },
        ['user123'],
      );
      const serialized = serializeSSERedisMessage(original);
      const deserialized = deserializeSSERedisMessage(serialized);

      it('preserves the message content', () => {
        expect(deserialized).toEqual(original);
      });

      it('maintains event message type', () => {
        expect(isSSEEventMessage(deserialized)).toBe(true);
      });
    });
  });

  describe('deserialization validation', () => {
    describe('when JSON is invalid', () => {
      it('throws deserialization error', () => {
        expect(() => {
          deserializeSSERedisMessage('invalid json');
        }).toThrow('Failed to deserialize SSE Redis message');
      });
    });

    describe('when value is not an object', () => {
      it('throws format error', () => {
        expect(() => {
          deserializeSSERedisMessage('"just a string"');
        }).toThrow('Invalid message format: not an object');
      });
    });

    describe('when timestamp is missing', () => {
      it('throws timestamp error', () => {
        expect(() => {
          deserializeSSERedisMessage(
            '{"userId": "user123", "action": "subscribe"}',
          );
        }).toThrow('Invalid message format: missing or invalid timestamp');
      });
    });

    describe('when subscription message format is invalid', () => {
      describe('when userId is missing', () => {
        it('throws userId error', () => {
          expect(() => {
            deserializeSSERedisMessage(
              JSON.stringify({
                action: 'subscribe',
                timestamp: new Date().toISOString(),
              }),
            );
          }).toThrow('Invalid subscription message: missing or invalid userId');
        });
      });

      describe('when action is invalid', () => {
        it('throws action error', () => {
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
      });
    });

    describe('when event message format is invalid', () => {
      describe('when eventType is missing', () => {
        it('throws eventType error', () => {
          expect(() => {
            deserializeSSERedisMessage(
              JSON.stringify({
                data: { test: true },
                timestamp: new Date().toISOString(),
              }),
            );
          }).toThrow('Invalid event message: missing or invalid eventType');
        });
      });

      describe('when params is not an array', () => {
        it('throws params error', () => {
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
  });
});
