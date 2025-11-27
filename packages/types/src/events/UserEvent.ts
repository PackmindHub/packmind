import { OrganizationId, UserId } from '../accounts';
import { PackmindEvent } from './PackmindEvent';

/**
 * Base payload for user-triggered events.
 * All UserEvent payloads automatically include userId and organizationId.
 */
export interface UserEventPayload {
  userId: UserId;
  organizationId: OrganizationId;
}

/**
 * Base class for user-triggered domain events.
 *
 * Use this for events that originate from user actions, such as:
 * - Creating, updating, or deleting resources
 * - User authentication events
 * - User-initiated workflows
 *
 * The payload automatically includes userId and organizationId.
 *
 * @example
 * ```typescript
 * export class RecipeCreatedEvent extends UserEvent<{
 *   recipeId: RecipeId;
 *   spaceId: SpaceId;
 * }> {
 *   static readonly eventName = 'recipes.recipe.created';
 * }
 * ```
 */
export abstract class UserEvent<TPayload = object> extends PackmindEvent<
  TPayload & UserEventPayload
> {}
