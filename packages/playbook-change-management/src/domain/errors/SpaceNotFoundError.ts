import { SpaceId } from '@packmind/types';

export class SpaceNotFoundError extends Error {
  constructor(spaceId: SpaceId) {
    super(`Space ${spaceId} not found`);
    this.name = 'SpaceNotFoundError';
  }
}
