import { ISpaceService } from '../../domain/services/ISpaceService';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { Space } from '@packmind/types';

export class SpaceService implements ISpaceService {
  constructor(private readonly spaceGateway: ISpacesGateway) {}

  async getGlobalSpace(): Promise<Space> {
    const { spaces } = await this.spaceGateway.getUserSpaces({});

    if (spaces.length > 1) {
      throw new Error('Multiple spaces detected');
    }

    return spaces[0];
  }
}
