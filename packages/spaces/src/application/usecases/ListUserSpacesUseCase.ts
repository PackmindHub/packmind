import {
  IListUserSpaces,
  ListUserSpacesCommand,
  ListUserSpacesResponse,
  OrganizationId,
} from '@packmind/types';
import { SpaceService } from '../services/SpaceService';

export class ListUserSpacesUseCase implements IListUserSpaces {
  constructor(private readonly spaceService: SpaceService) {}

  async execute(
    command: ListUserSpacesCommand,
  ): Promise<ListUserSpacesResponse> {
    const spaces = await this.spaceService.listSpacesByOrganization(
      command.organizationId as OrganizationId,
    );
    return {
      spaces,
      discoverableSpaces: [],
    };
  }
}
