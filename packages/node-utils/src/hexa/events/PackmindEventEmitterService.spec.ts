import { UserEvent } from '@packmind/types';
import { DataSource } from 'typeorm';
import { PackmindEventEmitterService } from './PackmindEventEmitterService';

class TestUserCreatedEvent extends UserEvent<{ userId: string }> {
  static override readonly eventName = 'test.user.created';
}

class TestUserDeletedEvent extends UserEvent<{ userId: string }> {
  static override readonly eventName = 'test.user.deleted';
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
    describe('when event has listeners', () => {
      it('returns true', () => {
        service.on(TestUserCreatedEvent, jest.fn());

        const result = service.emit(
          new TestUserCreatedEvent({ userId: 'user-123' }),
        );

        expect(result).toBe(true);
      });
    });

    describe('when event has no listeners', () => {
      it('returns false', () => {
        const result = service.emit(
          new TestUserCreatedEvent({ userId: 'user-123' }),
        );

        expect(result).toBe(false);
      });
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

    describe('when multiple handlers registered for same event', () => {
      let handler1: jest.Mock;
      let handler2: jest.Mock;

      beforeEach(() => {
        handler1 = jest.fn();
        handler2 = jest.fn();
        service.on(TestUserCreatedEvent, handler1);
        service.on(TestUserCreatedEvent, handler2);
        service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));
      });

      it('calls first handler once', () => {
        expect(handler1).toHaveBeenCalledTimes(1);
      });

      it('calls second handler once', () => {
        expect(handler2).toHaveBeenCalledTimes(1);
      });
    });

    describe('when handlers registered for different event types', () => {
      let createdHandler: jest.Mock;
      let deletedHandler: jest.Mock;

      beforeEach(() => {
        createdHandler = jest.fn();
        deletedHandler = jest.fn();
        service.on(TestUserCreatedEvent, createdHandler);
        service.on(TestUserDeletedEvent, deletedHandler);
        service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));
      });

      it('calls handler for emitted event type', () => {
        expect(createdHandler).toHaveBeenCalledTimes(1);
      });

      it('does not call handler for other event types', () => {
        expect(deletedHandler).not.toHaveBeenCalled();
      });
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

    describe('when removing one handler', () => {
      let handler1: jest.Mock;
      let handler2: jest.Mock;

      beforeEach(() => {
        handler1 = jest.fn();
        handler2 = jest.fn();
        service.on(TestUserCreatedEvent, handler1);
        service.on(TestUserCreatedEvent, handler2);
        service.off(TestUserCreatedEvent, handler1);
        service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));
      });

      it('does not call removed handler', () => {
        expect(handler1).not.toHaveBeenCalled();
      });

      it('keeps other handlers active', () => {
        expect(handler2).toHaveBeenCalledTimes(1);
      });
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

    describe('when multiple event types have listeners', () => {
      beforeEach(() => {
        service.on(TestUserCreatedEvent, jest.fn());
        service.on(TestUserCreatedEvent, jest.fn());
        service.on(TestUserDeletedEvent, jest.fn());
      });

      it('counts created event listeners correctly', () => {
        expect(service.listenerCount(TestUserCreatedEvent)).toBe(2);
      });

      it('counts deleted event listeners correctly', () => {
        expect(service.listenerCount(TestUserDeletedEvent)).toBe(1);
      });
    });
  });

  describe('removeAllListeners', () => {
    describe('when removing all listeners', () => {
      let handler1: jest.Mock;
      let handler2: jest.Mock;

      beforeEach(() => {
        handler1 = jest.fn();
        handler2 = jest.fn();
        service.on(TestUserCreatedEvent, handler1);
        service.on(TestUserDeletedEvent, handler2);
        service.removeAllListeners();
        service.emit(new TestUserCreatedEvent({ userId: 'user-123' }));
        service.emit(new TestUserDeletedEvent({ userId: 'user-456' }));
      });

      it('does not call first event handler', () => {
        expect(handler1).not.toHaveBeenCalled();
      });

      it('does not call second event handler', () => {
        expect(handler2).not.toHaveBeenCalled();
      });
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
