# Event

**Layer**: Types package (shared contract)
**Location**: `packages/types/src/events/{EventName}.ts`

Domain events enable asynchronous, decoupled communication between domains.

## Event Hierarchy

```
PackmindEvent<TPayload>         # Base class
├── UserEvent<TPayload>         # Triggered by a user action
└── SystemEvent<TPayload>       # Triggered by system/background process
```

### UserEvent

Includes `userId`, `organizationId`, and `source` in the payload:

```typescript
import { UserEvent, UserEventPayload } from './base';

type StandardCreatedPayload = {
  standardId: StandardId;
  spaceId: SpaceId;
};

export class StandardCreatedEvent extends UserEvent<StandardCreatedPayload> {
  static readonly eventName = 'standard.created';
}
```

The full payload at runtime will be: `StandardCreatedPayload & UserEventPayload` which includes `userId`, `organizationId`, and `source`.

### SystemEvent

For background processes — `organizationId` required, `userId` optional:

```typescript
import { SystemEvent, SystemEventPayload } from './base';

type PackageDeployedPayload = {
  packageId: PackageId;
  version: string;
};

export class PackageDeployedEvent extends SystemEvent<PackageDeployedPayload> {
  static readonly eventName = 'package.deployed';
}
```

## Emitting Events

From within a use case:

```typescript
this.eventEmitterService.emit(
  new StandardCreatedEvent({
    standardId: standard.id,
    spaceId: standard.spaceId,
    userId: command.userId,
    organizationId: command.organizationId,
    source: command.source ?? 'api',
  }),
);
```

## Listening to Events

See [listener.md](listener.md) for the listener pattern.

## Conventions

- **Event naming** — `{Entity}{Past tense verb}Event` (e.g., `StandardCreatedEvent`, `RuleDeletedEvent`)
- **Static `eventName`** — dot-separated string: `{entity}.{action}` (e.g., `standard.created`)
- **UserEvent vs SystemEvent** — use `UserEvent` when a user triggered it, `SystemEvent` for background/automated
- **Payload is a plain type** — no classes, just type aliases
- **Events are fire-and-forget** — emitters don't wait for listener results
