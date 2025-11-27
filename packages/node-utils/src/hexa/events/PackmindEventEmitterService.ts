import { EventEmitter } from 'events';
import { PackmindEvent, PackmindEventClass } from '@packmind/types';
import { DataSource } from 'typeorm';
import { BaseService, BaseServiceOpts } from '../BaseService';
import type { HexaRegistry } from '../HexaRegistry';

/**
 * Service for domain event emission and subscription.
 *
 * This service wraps Node.js EventEmitter to provide a type-safe API for
 * domain events. It should be registered in the HexaRegistry like any other service.
 *
 * @example
 * ```typescript
 * // Registration
 * registry.registerService(PackmindEventEmitterService);
 *
 * // Usage in a hexa
 * const eventService = registry.getService(PackmindEventEmitterService);
 * eventService.emit(new RecipeCreatedEvent({ recipeId, userId }));
 *
 * // Listening
 * eventService.on(RecipeCreatedEvent, (event) => {
 *   console.log('Recipe created:', event.payload.recipeId);
 * });
 * ```
 */
export class PackmindEventEmitterService extends BaseService<BaseServiceOpts> {
  private readonly emitter: EventEmitter;

  constructor(dataSource: DataSource, opts?: Partial<BaseServiceOpts>) {
    super(dataSource, opts);
    this.emitter = new EventEmitter();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_registry: HexaRegistry): Promise<void> {
    // No initialization needed - emitter is ready from construction
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }

  /**
   * Emit an event to all registered listeners.
   *
   * @param event - The event instance to emit
   * @returns true if the event had listeners, false otherwise
   */
  emit<T extends PackmindEvent>(event: T): boolean {
    const eventName = event.name;
    return this.emitter.emit(eventName, event);
  }

  /**
   * Register a listener for a specific event type.
   *
   * @param eventClass - The event class to listen for
   * @param handler - The handler function to call when the event is emitted
   * @returns this for chaining
   */
  on<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
    handler: (event: T) => void | Promise<void>,
  ): this {
    this.emitter.on(eventClass.eventName, handler);
    return this;
  }

  /**
   * Remove a listener for a specific event type.
   *
   * @param eventClass - The event class to stop listening for
   * @param handler - The handler function to remove
   * @returns this for chaining
   */
  off<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
    handler: (event: T) => void | Promise<void>,
  ): this {
    this.emitter.off(eventClass.eventName, handler);
    return this;
  }

  /**
   * Register a one-time listener for a specific event type.
   * The listener will be automatically removed after being called once.
   *
   * @param eventClass - The event class to listen for
   * @param handler - The handler function to call when the event is emitted
   * @returns this for chaining
   */
  once<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
    handler: (event: T) => void | Promise<void>,
  ): this {
    this.emitter.once(eventClass.eventName, handler);
    return this;
  }

  /**
   * Get the number of listeners for a specific event type.
   * Useful for testing and debugging.
   *
   * @param eventClass - The event class to check
   * @returns The number of registered listeners
   */
  listenerCount<T extends PackmindEvent>(
    eventClass: PackmindEventClass<T>,
  ): number {
    return this.emitter.listenerCount(eventClass.eventName);
  }

  /**
   * Remove all listeners for all events.
   * Use with caution - typically only needed for cleanup during shutdown or tests.
   *
   * @returns this for chaining
   */
  removeAllListeners(): this {
    this.emitter.removeAllListeners();
    return this;
  }
}
