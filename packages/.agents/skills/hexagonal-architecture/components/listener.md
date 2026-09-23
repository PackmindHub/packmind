# Listener

**Layer**: Application
**Location**: `packages/{domain}/src/application/listeners/{Domain}Listener.ts`

Listeners react to domain events emitted by other domains. They provide asynchronous, decoupled cross-domain communication.

## Structure

```typescript
import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  isInternalError,
  StandardDeletedEvent,
  SkillDeletedEvent,
} from '@packmind/types';

const origin = 'DeploymentsListener';

export class DeploymentsListener extends PackmindListener<IPackageRepository> {
  constructor(
    adapter: IPackageRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
    this.subscribe(SkillDeletedEvent, this.handleSkillDeleted);
  }

  private handleStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    const { standardId } = event.payload;
    this.logger.info('Handling StandardDeletedEvent', { standardId });

    try {
      await this.adapter.removeStandardFromAllPackages(standardId);
      this.logger.info('Standard removed from all packages successfully', {
        standardId,
      });
    } catch (error) {
      // A listener runs outside the HTTP request scope, so DomainExceptionFilter
      // never sees this — the listener is the only thing that will record it, and
      // it has to make the call the filter would have made. An expected failure
      // goes to `warn`; only a broken invariant of ours earns `error` and a stack.
      if (isInternalError(error)) {
        this.logger.error('Failed to remove standard from packages', {
          standardId,
          reason: error.reason,
          context: error.context,
          stack: error.stack,
        });
      } else {
        this.logger.warn('Failed to remove standard from packages', {
          standardId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  };
}
```

## Registration

Listeners are created in the Hexa **constructor** and initialized during the `initialize()` phase:

```typescript
// In {Domain}Hexa constructor:
this.listener = new DeploymentsListener(
  this.repositories.getPackageRepository(),
);

// In {Domain}Hexa.initialize():
this.listener.initialize(eventEmitterService);
```

The `initialize()` method on `PackmindListener` stores the event emitter service and calls `registerHandlers()` internally.

## Conventions

- **Optional per domain** — not all domains need listeners; only add one when the domain reacts to external events
- **Extends `PackmindListener<TAdapter>`** — provides `subscribe()` and event bus integration
- **Arrow function handlers** — to preserve `this` context
- **Handlers are private** — only `registerHandlers()` is called externally
- **Delegate to adapter** — handlers call adapter methods, they don't contain business logic
- **No return values** — handlers return `Promise<void>`
- **Logger** — inject `PackmindLogger` with a default instance in the constructor
- **Error handling** — wrap handler logic in try/catch with structured logging (log entry, success, and error with context)
