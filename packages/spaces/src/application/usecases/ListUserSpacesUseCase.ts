import {
  IListUserSpaces,
  ListUserSpacesCommand,
  ListUserSpacesResponse,
  OrganizationId,
  Space,
  UserSpaceMembership,
  UserId,
} from '@packmind/types';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

type MembershipWithSpace = UserSpaceMembership & { space: Space };

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

    const spaces = memberships
      .filter((m): m is MembershipWithSpace => m.space !== undefined)
      .map((m) => ({ ...m.space, role: m.role, pinned: m.pinned }));

    return { spaces };
  }
}
