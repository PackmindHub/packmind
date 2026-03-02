# Listener

**Layer**: Application
**Location**: `packages/{domain}/src/application/listeners/{Domain}Listener.ts`

Listeners react to domain events emitted by other domains. They provide asynchronous, decoupled cross-domain communication.

## Structure

```typescript
import { PackmindListener } from '@packmind/node-utils';
import {
  StandardCreatedEvent,
  StandardDeletedEvent,
  SkillDeletedEvent,
} from '@packmind/types';

export class DeploymentsListener extends PackmindListener<IPackageRepository> {

  protected registerHandlers(): void {
    this.subscribe(StandardCreatedEvent, this.handleStandardCreated);
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
    this.subscribe(SkillDeletedEvent, this.handleSkillDeleted);
  }

  private handleStandardCreated = async (
    event: StandardCreatedEvent,
  ): Promise<void> => {
    await this.adapter.invalidatePackagesContainingStandard(
      event.payload.standardId,
    );
  };

  private handleStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    await this.adapter.removeStandardFromAllPackages(
      event.payload.standardId,
    );
  };
}
```

## Registration

Listeners are registered during the Hexa's `initialize()` phase:

```typescript
// In {Domain}Hexa.initialize()
const listener = new DeploymentsListener(this.adapter);
listener.registerHandlers();
this.eventEmitterService.registerListener(listener);
```

## Conventions

- **One listener per domain** — `{Domain}Listener`
- **Extends `PackmindListener<TAdapter>`** — provides `subscribe()` and event bus integration
- **Arrow function handlers** — to preserve `this` context
- **Handlers are private** — only `registerHandlers()` is called externally
- **Delegate to adapter** — handlers call adapter methods, they don't contain business logic
- **No return values** — handlers return `Promise<void>`
