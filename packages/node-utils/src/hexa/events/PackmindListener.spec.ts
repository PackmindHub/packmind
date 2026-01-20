import { UserEvent, SystemEvent } from '@packmind/types';
import { DataSource } from 'typeorm';
import { PackmindEventEmitterService } from './PackmindEventEmitterService';
import { PackmindListener } from './PackmindListener';

class TestUserCreatedEvent extends UserEvent<{
  userId: string;
  email: string;
}> {
  static override readonly eventName = 'test.user.created';
}

class TestSyncCompletedEvent extends SystemEvent<{
  repositoryId: string;
  commitCount: number;
}> {
  static override readonly eventName = 'test.sync.completed';
}

interface StubAdapter {
  handleUserCreated(userId: string, email: string): void;
  handleSyncCompleted(repositoryId: string, commitCount: number): void;
}

class TestListener extends PackmindListener<StubAdapter> {
  protected registerHandlers(): void {
    this.subscribe(TestUserCreatedEvent, this.onUserCreated);
    this.subscribe(TestSyncCompletedEvent, this.onSyncCompleted);
  }

  private onUserCreated = (event: TestUserCreatedEvent): void => {
    this.adapter.handleUserCreated(event.payload.userId, event.payload.email);
  };

  private onSyncCompleted = (event: TestSyncCompletedEvent): void => {
    this.adapter.handleSyncCompleted(
      event.payload.repositoryId,
      event.payload.commitCount,
    );
  };
}

class EmptyListener extends PackmindListener<StubAdapter> {
  protected registerHandlers(): void {
    // No handlers registered
  }
}

describe('PackmindListener', () => {
  let eventService: PackmindEventEmitterService;
  let stubAdapter: StubAdapter;
  let mockDataSource: DataSource;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);
    stubAdapter = {
      handleUserCreated: jest.fn(),
      handleSyncCompleted: jest.fn(),
    };
  });

  afterEach(() => {
    eventService.removeAllListeners();
  });

  describe('initialize', () => {
    let listener: TestListener;

    beforeEach(() => {
      listener = new TestListener(stubAdapter);
      listener.initialize(eventService);
    });

    it('registers user created event handler', () => {
      expect(eventService.listenerCount(TestUserCreatedEvent)).toBe(1);
    });

    it('registers sync completed event handler', () => {
      expect(eventService.listenerCount(TestSyncCompletedEvent)).toBe(1);
    });
  });

  describe('subscribe', () => {
    it('registers handler with event emitter service', () => {
      const listener = new TestListener(stubAdapter);
      listener.initialize(eventService);

      eventService.emit(
        new TestUserCreatedEvent({
          userId: 'user-123',
          email: 'test@example.com',
        }),
      );

      expect(stubAdapter.handleUserCreated).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
      );
    });

    it('binds handler to listener instance', () => {
      const listener = new TestListener(stubAdapter);
      listener.initialize(eventService);

      eventService.emit(
        new TestUserCreatedEvent({
          userId: 'user-456',
          email: 'another@example.com',
        }),
      );

      expect(stubAdapter.handleUserCreated).toHaveBeenCalledTimes(1);
    });

    describe('when handling multiple event types', () => {
      beforeEach(() => {
        const listener = new TestListener(stubAdapter);
        listener.initialize(eventService);

        eventService.emit(
          new TestUserCreatedEvent({
            userId: 'user-123',
            email: 'test@example.com',
          }),
        );
        eventService.emit(
          new TestSyncCompletedEvent({
            repositoryId: 'repo-456',
            commitCount: 5,
          }),
        );
      });

      it('invokes user created handler with correct arguments', () => {
        expect(stubAdapter.handleUserCreated).toHaveBeenCalledWith(
          'user-123',
          'test@example.com',
        );
      });

      it('invokes sync completed handler with correct arguments', () => {
        expect(stubAdapter.handleSyncCompleted).toHaveBeenCalledWith(
          'repo-456',
          5,
        );
      });
    });
  });

  describe('adapter access', () => {
    it('provides access to adapter in handlers', () => {
      const listener = new TestListener(stubAdapter);
      listener.initialize(eventService);

      eventService.emit(
        new TestUserCreatedEvent({
          userId: 'user-789',
          email: 'user@test.com',
        }),
      );

      expect(stubAdapter.handleUserCreated).toHaveBeenCalledWith(
        'user-789',
        'user@test.com',
      );
    });
  });

  describe('destroy', () => {
    it('can be called without error', () => {
      const listener = new TestListener(stubAdapter);
      listener.initialize(eventService);

      expect(() => listener.destroy()).not.toThrow();
    });
  });

  describe('empty listener', () => {
    it('initializes without registering handlers', () => {
      const listener = new EmptyListener(stubAdapter);

      listener.initialize(eventService);

      expect(eventService.listenerCount(TestUserCreatedEvent)).toBe(0);
    });
  });

  describe('multiple listeners', () => {
    let adapter1: StubAdapter;
    let adapter2: StubAdapter;

    beforeEach(() => {
      adapter1 = {
        handleUserCreated: jest.fn(),
        handleSyncCompleted: jest.fn(),
      };
      adapter2 = {
        handleUserCreated: jest.fn(),
        handleSyncCompleted: jest.fn(),
      };

      const listener1 = new TestListener(adapter1);
      const listener2 = new TestListener(adapter2);

      listener1.initialize(eventService);
      listener2.initialize(eventService);

      eventService.emit(
        new TestUserCreatedEvent({
          userId: 'user-shared',
          email: 'shared@example.com',
        }),
      );
    });

    it('invokes first listener handler', () => {
      expect(adapter1.handleUserCreated).toHaveBeenCalledWith(
        'user-shared',
        'shared@example.com',
      );
    });

    it('invokes second listener handler', () => {
      expect(adapter2.handleUserCreated).toHaveBeenCalledWith(
        'user-shared',
        'shared@example.com',
      );
    });
  });

  describe('event type discrimination', () => {
    describe('when emitting UserEvent', () => {
      beforeEach(() => {
        const listener = new TestListener(stubAdapter);
        listener.initialize(eventService);

        eventService.emit(
          new TestUserCreatedEvent({
            userId: 'user-123',
            email: 'test@example.com',
          }),
        );
      });

      it('invokes user created handler', () => {
        expect(stubAdapter.handleUserCreated).toHaveBeenCalled();
      });

      it('does not invoke sync completed handler', () => {
        expect(stubAdapter.handleSyncCompleted).not.toHaveBeenCalled();
      });
    });

    describe('when emitting SystemEvent', () => {
      beforeEach(() => {
        const listener = new TestListener(stubAdapter);
        listener.initialize(eventService);

        eventService.emit(
          new TestSyncCompletedEvent({
            repositoryId: 'repo-123',
            commitCount: 10,
          }),
        );
      });

      it('invokes sync completed handler', () => {
        expect(stubAdapter.handleSyncCompleted).toHaveBeenCalled();
      });

      it('does not invoke user created handler', () => {
        expect(stubAdapter.handleUserCreated).not.toHaveBeenCalled();
      });
    });
  });
});
