import {
  createOrganizationId,
  createUserId,
  ListUserSpacesCommand,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import { ListUserSpacesUseCase } from './ListUserSpacesUseCase';

describe('ListUserSpacesUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');

  let useCase: ListUserSpacesUseCase;
  let membershipService: jest.Mocked<UserSpaceMembershipService>;

  const buildCommand = (
    overrides?: Partial<ListUserSpacesCommand>,
  ): ListUserSpacesCommand => ({
    userId,
    organizationId,
    ...overrides,
  });

  beforeEach(() => {
    membershipService = {
      findMembershipsByUserAndOrganization: jest.fn(),
    } as unknown as jest.Mocked<UserSpaceMembershipService>;

    useCase = new ListUserSpacesUseCase(membershipService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when user has memberships with spaces', () => {
      const space1 = spaceFactory({ organizationId });
      const space2 = spaceFactory({ organizationId });
      const memberships: UserSpaceMembership[] = [
        {
          userId,
          spaceId: space1.id,
          role: UserSpaceRole.MEMBER,
          space: space1,
        },
        {
          userId,
          spaceId: space2.id,
          role: UserSpaceRole.ADMIN,
          space: space2,
        },
      ];

      beforeEach(() => {
        membershipService.findMembershipsByUserAndOrganization.mockResolvedValue(
          memberships,
        );
      });

      it('returns spaces from memberships', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual({ spaces: [space1, space2] });
      });

      it('calls membership service with correct params', async () => {
        await useCase.execute(buildCommand());

        expect(
          membershipService.findMembershipsByUserAndOrganization,
        ).toHaveBeenCalledWith(userId, organizationId);
      });
    });

    describe('when user has no memberships', () => {
      beforeEach(() => {
        membershipService.findMembershipsByUserAndOrganization.mockResolvedValue(
          [],
        );
      });

      it('returns an empty spaces list', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual({ spaces: [] });
      });
    });

    describe('when memberships have undefined space', () => {
      const space1 = spaceFactory({ organizationId });
      const memberships: UserSpaceMembership[] = [
        {
          userId,
          spaceId: space1.id,
          role: UserSpaceRole.MEMBER,
          space: space1,
        },
        {
          userId,
          spaceId: space1.id,
          role: UserSpaceRole.MEMBER,
          space: undefined,
        },
      ];

      beforeEach(() => {
        membershipService.findMembershipsByUserAndOrganization.mockResolvedValue(
          memberships,
        );
      });

      it('filters out memberships with undefined space', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual({ spaces: [space1] });
      });
    });
  });
});
