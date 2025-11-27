import { PackmindEvent } from './PackmindEvent';

/**
 * Base class for user-triggered domain events.
 *
 * Use this for events that originate from user actions, such as:
 * - Creating, updating, or deleting resources
 * - User authentication events
 * - User-initiated workflows
 *
 * @example
 * ```typescript
 * export class RecipeCreatedEvent extends UserEvent<{
 *   recipeId: RecipeId;
 *   userId: UserId;
 *   organizationId: OrganizationId;
 * }> {
 *   static readonly eventName = 'recipes.recipe.created';
 * }
 * ```
 */
export abstract class UserEvent<
  TPayload = unknown,
> extends PackmindEvent<TPayload> {}
