import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  UserSpaceRole,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SpaceMembersController } from './members.controller';
import { SpaceMembersService } from './members.service';

describe('SpaceMembersController', () => {
  let controller: SpaceMembersController;
  let membersService: jest.Mocked<SpaceMembersService>;
  let logger: jest.Mocked<PackmindLogger>;

  const orgId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');
  const userId = createUserId('user-1');
  const targetUserId = createUserId('target-user-1');
  const request = {
    organization: {
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      role: 'admin',
    },
    user: {
      userId,
      name: 'Test User',
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    logger = stubLogger();
    membersService = {
      listSpaceMembers: jest.fn(),
      addMembersToSpace: jest.fn(),
      removeMemberFromSpace: jest.fn(),
      updateMemberRole: jest.fn(),
    } as unknown as jest.Mocked<SpaceMembersService>;
    controller = new SpaceMembersController(membersService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when caller is an org admin (not a space member)', () => {
    it('addMembers succeeds', async () => {
      membersService.addMembersToSpace.mockResolvedValue({ memberships: [] });

      await expect(
        controller.addMembers(orgId, spaceId, { members: [] }, request),
      ).resolves.toEqual({ memberships: [] });
    });

    it('removeMember succeeds', async () => {
      membersService.removeMemberFromSpace.mockResolvedValue({ removed: true });

      await expect(
        controller.removeMember(orgId, spaceId, targetUserId, request),
      ).resolves.toEqual({ removed: true });
    });

    it('updateMemberRole succeeds', async () => {
      membersService.updateMemberRole.mockResolvedValue({ updated: true });

      await expect(
        controller.updateMemberRole(
          orgId,
          spaceId,
          targetUserId,
          { role: UserSpaceRole.ADMIN },
          request,
        ),
      ).resolves.toEqual({ updated: true });
    });
  });
});
