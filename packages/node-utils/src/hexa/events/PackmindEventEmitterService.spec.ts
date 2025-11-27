import { UserEvent } from '@packmind/types';
import { DataSource } from 'typeorm';
import { PackmindEventEmitterService } from './PackmindEventEmitterService';

class TestUserCreatedEvent extends UserEvent<{ userId: string }> {
  static readonly eventName = 'test.user.created';
}

class TestUserDeletedEvent extends UserEvent<{ userId: string }> {
  static readonly eventName = 'test.user.deleted';
}

describe('PackmindEventEmitterService', () => {
  let service: PackmindEventEmitterService;
  let mockDataSource: DataSource;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    service = new PackmindEventEmitterService(mockDataSource);
  });

  afterEach(() => {
    service.removeAllListeners();
  });

  describe('emit', () => {
    it('returns true when event has listeners', () => {
      service.on(TestUserCreatedEvent, jest.fn());

      const result = service.emit(
        new TestUserCreatedEvent({ userId: 'user-123' }),
      );

      expect(result).toBe(true);
    });

    it('returns false when event has no listeners', () => {
      const result = service.emit(
        new TestUserCreatedEvent({ userId: 'user-123' }),
      );

      expect(result).toBe(false);
    });

    it('passes event instance to handler', () => {
      const handler = jest.fn();
      service.on(TestUserCreatedEvent, handler);

      const event = new TestUserCreatedEvent({ userId: 'user-123' });
      service.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('provides access to payload in handler', () => {
      let receivedPayload: { userId: string } | undefined;
      service.on(TestUserCreatedEvent, (event) => {
        receivedPayload = event.payload;
      });

      service.emit(new TestUserCreatedEvent({ userId: 'user-456' }));

      expect(receivedPayload).toEqual({ userId: 'user-456' });
    });
  });

  describe('on', () => {
    it('registers handler for event type', () => {
      const handler = jest.fn();

      service.on(TestUserCreatedEvent, handler);
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('allows multiple handlers for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.on(TestUserCreatedEvent, handler1);
      service.on(TestUserCreatedEvent, handler2);
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('isolates handlers for different event types', () => {
      const createdHandler = jest.fn();
      const deletedHandler = jest.fn();

      service.on(TestUserCreatedEvent, createdHandler);
      service.on(TestUserDeletedEvent, deletedHandler);
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(createdHandler).toHaveBeenCalledTimes(1);
      expect(deletedHandler).not.toHaveBeenCalled();
    });

    it('returns service for chaining', () => {
      const result = service.on(TestUserCreatedEvent, jest.fn());

      expect(result).toBe(service);
    });
  });

  describe('off', () => {
    it('removes specific handler', () => {
      const handler = jest.fn();

      service.on(TestUserCreatedEvent, handler);
      service.off(TestUserCreatedEvent, handler);
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('keeps other handlers when removing one', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.on(TestUserCreatedEvent, handler1);
      service.on(TestUserCreatedEvent, handler2);
      service.off(TestUserCreatedEvent, handler1);
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('returns service for chaining', () => {
      const handler = jest.fn();
      service.on(TestUserCreatedEvent, handler);

      const result = service.off(TestUserCreatedEvent, handler);

      expect(result).toBe(service);
    });
  });

  describe('once', () => {
    it('calls handler only once', () => {
      const handler = jest.fn();

      service.once(TestUserCreatedEvent, handler);
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));
      service.emit(new TestUserCreatedEvent({ userId: 'user-456' }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('receives correct event on single call', () => {
      let receivedPayload: { userId: string } | undefined;

      service.once(TestUserCreatedEvent, (event) => {
        receivedPayload = event.payload;
      });
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(receivedPayload).toEqual({ userId: 'user-123' });
    });

    it('returns service for chaining', () => {
      const result = service.once(TestUserCreatedEvent, jest.fn());

      expect(result).toBe(service);
    });
  });

  describe('listenerCount', () => {
    it('returns 0 for event with no listeners', () => {
      const count = service.listenerCount(TestUserCreatedEvent);

      expect(count).toBe(0);
    });

    it('returns correct count for single listener', () => {
      service.on(TestUserCreatedEvent, jest.fn());

      const count = service.listenerCount(TestUserCreatedEvent);

      expect(count).toBe(1);
    });

    it('returns correct count for multiple listeners', () => {
      service.on(TestUserCreatedEvent, jest.fn());
      service.on(TestUserCreatedEvent, jest.fn());
      service.on(TestUserCreatedEvent, jest.fn());

      const count = service.listenerCount(TestUserCreatedEvent);

      expect(count).toBe(3);
    });

    it('counts listeners per event type', () => {
      service.on(TestUserCreatedEvent, jest.fn());
      service.on(TestUserCreatedEvent, jest.fn());
      service.on(TestUserDeletedEvent, jest.fn());

      expect(service.listenerCount(TestUserCreatedEvent)).toBe(2);
      expect(service.listenerCount(TestUserDeletedEvent)).toBe(1);
    });
  });

  describe('removeAllListeners', () => {
    it('removes all listeners for all events', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.on(TestUserCreatedEvent, handler1);
      service.on(TestUserDeletedEvent, handler2);
      service.removeAllListeners();

      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));
      service.emit(new TestUserDeletedEvent({ userId: 'user-456' }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('returns service for chaining', () => {
      const result = service.removeAllListeners();

      expect(result).toBe(service);
    });
  });

  describe('destroy', () => {
    it('removes all listeners', () => {
      const handler = jest.fn();
      service.on(TestUserCreatedEvent, handler);

      service.destroy();
      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('async handlers', () => {
    it('supports async handlers', async () => {
      const results: string[] = [];

      service.on(TestUserCreatedEvent, async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(event.payload.userId);
      });

      service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(results).toEqual(['user-123']);
    });
  });
});
