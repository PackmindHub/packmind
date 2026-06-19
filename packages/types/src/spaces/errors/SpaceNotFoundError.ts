import { SpaceId } from '../SpaceId';

export class SpaceNotFoundError extends Error {
  constructor(spaceIdOrSlug: SpaceId | string) {
    super(`Space ${spaceIdOrSlug} not found`);
    this.name = 'SpaceNotFoundError';
  }
}
