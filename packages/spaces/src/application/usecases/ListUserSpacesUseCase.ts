import {
  IListUserSpaces,
  ListUserSpacesCommand,
  ListUserSpacesResponse,
  OrganizationId,
  Space,
  UserId,
} from '@packmind/types';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

export class ListUserSpacesUseCase implements IListUserSpaces {
  constructor(
    private readonly userSpaceMembershipService: UserSpaceMembershipService,
  ) {}

  async execute(
    command: ListUserSpacesCommand,
  ): Promise<ListUserSpacesResponse> {
    const memberships =
      await this.userSpaceMembershipService.findMembershipsByUserAndOrganization(
        command.userId as UserId,
        command.organizationId as OrganizationId,
      );

    return memberships
      .map((m) => m.space)
      .filter((s): s is Space => s !== undefined);
  }
}
