# Domain Events

Domain events enable communication between hexas without creating direct dependencies.

## Event Structure

Events live in `packages/types/src/{domain}/events/` with an `index.ts` barrel file.

```typescript
// 1. Define payload interface
export interface StandardUpdatedPayload {
  standardId: string
  organizationId: string
  userId: string
}

// 2. Define event class
export class StandardUpdatedEvent extends UserEvent {
  static override readonly eventName = 'standard.standard.updated'
  constructor(public readonly payload: StandardUpdatedPayload) { super() }
}
```

## Rules

- Define a separate `{EventName}Payload` interface for each event
- Extend `UserEvent` for user-triggered actions (payload must include `userId` + `organizationId`)
- Extend `SystemEvent` for automated/background processes (payload includes `organizationId` when applicable)
- Suffix class names with `Event`
- Use `domain.entity.action` format for `eventName`
- Emit **after** the operation succeeds, never before
- Export new events from the domain's `events/index.ts` barrel

## Listener Pattern

```typescript
export class StandardListener extends PackmindListener<StandardAdapter> {
  registerHandlers() {
    this.subscribe(StandardUpdatedEvent, this.onStandardUpdated)
  }

  // Arrow function to preserve `this`
  private onStandardUpdated = async (event: StandardUpdatedEvent) => {
    // handle event
  }
}
```

## Analytics Tracking

Every event extending `UserEvent` that is emitted via `eventEmitterService.emit()` must have a corresponding `this.subscribe()` in `AmplitudeEventListener.registerHandlers()` (`packages/amplitude/src/application/AmplitudeEventListener.ts`). Missing subscriptions mean silent analytics gaps.
