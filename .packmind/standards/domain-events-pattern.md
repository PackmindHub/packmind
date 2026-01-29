# Domain Events Pattern

Implement cross-domain communication using PackmindListener and domain events to maintain loose coupling between hexagonal domains.

**Discovered:** 39 files use the event-driven architecture with `PackmindListener` and `eventEmitterService.emit()`. This enables domains to react to changes without direct dependencies.

**Evidence:** packages/deployments/src/application/listeners/, packages/standards/src/application/useCases/, packages/skills/src/

## Rules

* Extend `PackmindListener<TAdapter>` and implement `registerHandlers()` to subscribe to domain events
* Use arrow functions for event handlers to preserve `this` binding (e.g., `private onRecipeCreated = async (event) => {}`)
* Emit events from UseCases using `eventEmitterService.emit(new MyEvent(payload))` after successful operations
* Define event classes with `static override readonly eventName` using the `domain.entity.action` naming pattern

### Examples

**Positive (correct):**
```typescript
// Listener in consuming domain
class DeploymentsListener extends PackmindListener<IDeploymentPort> {
  protected registerHandlers(): void {
    this.subscribe(StandardUpdatedEvent, this.onStandardUpdated);
  }

  private onStandardUpdated = async (event: StandardUpdatedEvent): Promise<void> => {
    await this.adapter.revalidateStandardDeployments(event.payload.standardId);
  };
}

// Event emission in UseCase
await this.eventEmitterService.emit(
  new StandardUpdatedEvent({
    standardId: standard.id,
    userId: command.userId,
    organizationId: command.organizationId,
  })
);
```

**Negative (incorrect):**
```typescript
// Don't call other domains directly
class UpdateStandardUseCase {
  constructor(
    private deploymentsService: DeploymentsService // Direct coupling - BAD
  ) {}

  async execute(command) {
    // Don't do this - creates tight coupling
    await this.deploymentsService.revalidate(standard.id);
  }
}
```
