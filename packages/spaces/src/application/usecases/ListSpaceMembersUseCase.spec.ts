import {
  IAccountsPort,
  ListSpaceMembersCommand,
  createOrganizationId,
  createSpaceId,
  createUserId,
  UserSpaceRole,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { userSpaceMembershipFactory } from '@packmind/spaces/test/userSpaceMembershipFactory';
import { stubLogger } from '@packmind/test-utils';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import { ListSpaceMembersUseCase } from './ListSpaceMembersUseCase';

describe('ListSpaceMembersUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: ListSpaceMembersUseCase;
  let membershipService: jest.Mocked<UserSpaceMembershipService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  const buildCommand = (
    overrides?: Partial<ListSpaceMembersCommand>,
  ): ListSpaceMembersCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    ...overrides,
  });

  beforeEach(() => {
    membershipService = {
      listSpaceMembers: jest.fn(),
    } as unknown as jest.Mocked<UserSpaceMembershipService>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ListSpaceMembersUseCase(
      membershipService,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the space has members', () => {
      const memberships = [
        userSpaceMembershipFactory({ spaceId, role: UserSpaceRole.ADMIN }),
        userSpaceMembershipFactory({ spaceId, role: UserSpaceRole.MEMBER }),
      ];

      beforeEach(() => {
        membershipService.listSpaceMembers.mockResolvedValue(memberships);
      });

      it('returns all memberships', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual(memberships);
      });

      it('calls listSpaceMembers with the spaceId', async () => {
        await useCase.execute(buildCommand());

        expect(membershipService.listSpaceMembers).toHaveBeenCalledWith(
          spaceId,
        );
      });
    });

    describe('when the space has no members', () => {
      beforeEach(() => {
        membershipService.listSpaceMembers.mockResolvedValue([]);
      });

      it('returns an empty array', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual([]);
      });
    });

    describe('when the user is not a member of the organization', () => {
      beforeEach(() => {
        accountsPort.getUserById.mockResolvedValue(
          userFactory({ id: userId, memberships: [] }),
        );
      });

      it('throws an access error', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow();
      });
    });
  });
});
