/**
 * Base class for all Packmind domain events.
 *
 * Events are used to communicate between hexas without creating direct dependencies.
 * Each event class must define a static `eventName` property that uniquely identifies the event.
 *
 * @example
 * ```typescript
 * export class RecipeCreatedEvent extends UserEvent<{ recipeId: RecipeId; userId: UserId }> {
 *   static readonly eventName = 'recipes.recipe.created';
 * }
 *
 * // Emitting
 * eventEmitter.emit(new RecipeCreatedEvent({ recipeId, userId }));
 *
 * // Listening
 * eventEmitter.on(RecipeCreatedEvent, (event) => {
 *   console.log(event.payload.recipeId);
 * });
 * ```
 */
export abstract class PackmindEvent<TPayload = unknown> {
  /**
   * Unique identifier for this event type.
   * Must be overridden by subclasses.
   * Convention: `domain.entity.action` (e.g., 'recipes.recipe.created')
   */
  static readonly eventName: string;

  constructor(public readonly payload: TPayload) {}

  /**
   * Get the event name from the static property.
   * Used internally by the event emitter.
   */
  get name(): string {
    return (this.constructor as typeof PackmindEvent).eventName;
  }
}

/**
 * Type representing a PackmindEvent class constructor.
 * Used for type-safe event registration and emission.
 */
export type PackmindEventClass<T extends PackmindEvent = PackmindEvent> = {
  new (payload: T extends PackmindEvent<infer P> ? P : never): T;
  readonly eventName: string;
};
