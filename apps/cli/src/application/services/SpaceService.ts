import { ISpaceService } from '../../domain/services/ISpaceService';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { Space } from '@packmind/types';

export class SpaceService implements ISpaceService {
  constructor(private readonly spaceGateway: ISpacesGateway) {}

  async getSpaces(): Promise<Space[]> {
    const spaces = await this.spaceGateway.getUserSpaces({});
    if (!Array.isArray(spaces)) {
      throw new Error(
        `Unexpected response from spaces API: ${JSON.stringify(spaces)}`,
      );
    }
    return spaces;
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
