# Domain Events

Domain events enable communication between hexas without creating direct dependencies. Apply these rules when creating events, emitting them, or implementing listeners to react to events from other domains.

## Rules

* Define payload as a separate `{EventName}Payload` interface
* Define event classes in `packages/types/src/{domain}/events/` with an `index.ts` barrel file
* Extend `UserEvent` for user-triggered actions, `SystemEvent` for background/automated processes
* Suffix event class names with `Event` (e.g., `StandardUpdatedEvent`)
* Use `static override readonly eventName` with `domain.entity.action` pattern
* Include `userId` and `organizationId` in UserEvent payloads; include `organizationId` in SystemEvent payloads when applicable
* Use `eventEmitterService.emit(new MyEvent(payload))` to emit events
* Extend `PackmindListener<TAdapter>` and implement `registerHandlers()` to subscribe to events
* Use `this.subscribe(EventClass, this.handlerMethod)` to register handlers
* Use arrow functions for handlers to preserve `this` binding
