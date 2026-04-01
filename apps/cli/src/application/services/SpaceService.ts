import { ISpaceService } from '../../domain/services/ISpaceService';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { Space } from '@packmind/types';

export class SpaceService implements ISpaceService {
  constructor(private readonly spaceGateway: ISpacesGateway) {}

  async getSpaces(): Promise<Space[]> {
    const response = await this.spaceGateway.getUserSpaces({});

    // Support both Space[] (new API on /user-spaces) and { spaces: Space[] } (backward compat wrapper)
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray((response as { spaces: Space[] }).spaces)) {
      return (response as { spaces: Space[] }).spaces;
    }

    throw new Error(
      `Unexpected response from spaces API: ${JSON.stringify(response)}`,
    );
  }

  async getDefaultSpace(): Promise<Space> {
    const spaces = await this.getSpaces();
    const defaultSpace = spaces.find((space) => space.isDefaultSpace);

    if (!defaultSpace) {
      throw new Error('No default space found for this organization');
    }

    return defaultSpace;
  }
}
