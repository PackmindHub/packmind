import { PackmindEvent, PackmindEventClass } from '@packmind/types';
import { PackmindEventEmitterService } from './PackmindEventEmitterService';

/**
 * Abstract base class for domain event listeners.
 *
 * Listeners are owned by hexas and provide a way to react to events from other domains
 * without creating direct dependencies. Each listener receives the hexa's adapter
 * in its constructor and uses it to perform actions in response to events.
 *
 * @example
 * ```typescript
 * class DeploymentsListener extends PackmindListener<IDeploymentPort> {
 *   protected registerHandlers(): void {
 *     this.subscribe(RecipeCreatedEvent, this.onRecipeCreated);
 *     this.subscribe(StandardUpdatedEvent, this.onStandardUpdated);
 *   }
 *
 *   private onRecipeCreated = async (event: RecipeCreatedEvent): Promise<void> => {
 *     await this.adapter.invalidatePackagesContainingRecipe(event.payload.recipeId);
 *   };
 *
 *   private onStandardUpdated = async (event: StandardUpdatedEvent): Promise<void> => {
 *     await this.adapter.revalidateStandardDeployments(event.payload.standardId);
 *   };
 * }
 * ```
 *
 * @typeParam TAdapter - The type of the adapter this listener uses to perform actions
 */
export abstract class PackmindListener<TAdapter> {
  protected eventEmitterService!: PackmindEventEmitterService;

  constructor(protected readonly adapter: TAdapter) {}

  /**
   * Initialize the listener with the event emitter service.
   * This is called by the hexa during its initialization phase.
   *
   * @param eventEmitterService - The event emitter service from the registry
   */
  initialize(eventEmitterService: PackmindEventEmitterService): void {
    this.eventEmitterService = eventEmitterService;
    this.registerHandlers();
  }

  /**
   * Register event handlers for this listener.
   * Subclasses must implement this method to set up their event subscriptions.
   *
   * Use the `subscribe()` helper method to register handlers with automatic binding.
   */
  protected abstract registerHandlers(): void;

  /**
   * Subscribe to an event type with automatic handler binding.
   *
   * This helper method ensures the handler is properly bound to `this`,
   * allowing handlers to access `this.adapter` and other instance properties.
   *
   * @param eventClass - The event class to subscribe to
   * @param handler - The handler method (use arrow function or will be auto-bound)
   */
  protected subscribe<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
    handler: (event: T) => void | Promise<void>,
  ): void {
    this.eventEmitterService.on(eventClass, handler.bind(this));
  }

  /**
   * Called during hexa destruction to clean up resources.
   * Subclasses can override this to perform additional cleanup if needed.
   */
  destroy(): void {
    // Default implementation does nothing.
    // Subclasses can override to unsubscribe from specific events or perform cleanup.
  }
}
