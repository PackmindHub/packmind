---
applyTo: '**'
---
## Standard: Domain Events

Use when creating domain events, emitting events from use cases, or implementing listeners. :
* Define event classes in `packages/types/src/{domain}/events/` with an `index.ts` barrel file
* Define payload as a separate `{EventName}Payload` interface
* Extend `PackmindListener<TAdapter>` and implement `registerHandlers()` to subscribe to events
* Extend `UserEvent` for user-triggered actions, `SystemEvent` for background/automated processes
* Include `userId` and `organizationId` in UserEvent payloads; include `organizationId` in SystemEvent payloads when applicable
* Suffix event class names with `Event` (e.g., `StandardUpdatedEvent`)
* Use `eventEmitterService.emit(new MyEvent(payload))` to emit events
* Use `static override readonly eventName` with `domain.entity.action` pattern
* Use `this.subscribe(EventClass, this.handlerMethod)` to register handlers
* Use arrow functions for handlers to preserve `this` binding

Full standard is available here for further request: [Domain Events](../../.packmind/standards/domain-events.md)