import {
  UpdateMemberRoleCommand,
  IAccountsPort,
  createOrganizationId,
  createSpaceId,
  createUserId,
  UserSpaceRole,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { userSpaceMembershipFactory } from '@packmind/spaces/test/userSpaceMembershipFactory';
import { SpaceAdminRequiredError } from '../../domain/errors/SpaceAdminRequiredError';
import { CannotUpdateOwnRoleError } from '../../domain/errors/CannotUpdateOwnRoleError';
import { MemberNotFoundError } from '../../domain/errors/MemberNotFoundError';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import { UpdateMemberRoleUseCase } from './UpdateMemberRoleUseCase';

describe('UpdateMemberRoleUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('admin-user-id');
  const targetUserId = createUserId('target-user-id');
  const spaceId = createSpaceId('space-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'admin' }],
  });

  let useCase: UpdateMemberRoleUseCase;
  let membershipService: jest.Mocked<UserSpaceMembershipService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  const buildCommand = (
    overrides?: Partial<UpdateMemberRoleCommand>,
  ): UpdateMemberRoleCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    targetUserId,
    role: UserSpaceRole.MEMBER,
    ...overrides,
  });

  beforeEach(() => {
    membershipService = {
      findMembership: jest.fn(),
      updateMembershipRole: jest.fn(),
    } as unknown as jest.Mocked<UserSpaceMembershipService>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new UpdateMemberRoleUseCase(
      membershipService,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the role is updated successfully', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(
          userSpaceMembershipFactory({
            userId,
            spaceId,
            role: UserSpaceRole.ADMIN,
          }),
        );
        membershipService.updateMembershipRole.mockResolvedValue(true);
      });

      it('returns updated true', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual({ updated: true });
      });

      it('calls updateMembershipRole with the correct arguments', async () => {
        await useCase.execute(buildCommand({ role: UserSpaceRole.MEMBER }));

        expect(membershipService.updateMembershipRole).toHaveBeenCalledWith(
          targetUserId,
          spaceId,
          UserSpaceRole.MEMBER,
        );
      });
    });

    describe('when the caller is not a space admin', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(
          userSpaceMembershipFactory({
            userId,
            spaceId,
            role: UserSpaceRole.MEMBER,
          }),
        );
      });

      it('throws SpaceAdminRequiredError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceAdminRequiredError,
        );
      });

      it('does not call updateMembershipRole', async () => {
        await useCase.execute(buildCommand()).catch(() => {});

        expect(membershipService.updateMembershipRole).not.toHaveBeenCalled();
      });
    });

    describe('when the caller has no space membership', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(null);
      });

      it('throws SpaceAdminRequiredError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceAdminRequiredError,
        );
      });
    });

    describe('when the target user is not a space member', () => {
      beforeEach(() => {
        membershipService.findMembership
          .mockResolvedValueOnce(
            userSpaceMembershipFactory({
              userId,
              spaceId,
              role: UserSpaceRole.ADMIN,
            }),
          )
          .mockResolvedValueOnce(null);
      });

      it('throws MemberNotFoundError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          MemberNotFoundError,
        );
      });

      it('does not call updateMembershipRole', async () => {
        await useCase.execute(buildCommand()).catch(() => {});

        expect(membershipService.updateMembershipRole).not.toHaveBeenCalled();
      });
    });

    describe('when the caller tries to update their own role', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(
          userSpaceMembershipFactory({
            userId,
            spaceId,
            role: UserSpaceRole.ADMIN,
          }),
        );
      });

      it('throws CannotUpdateOwnRoleError', async () => {
        await expect(
          useCase.execute(buildCommand({ targetUserId: userId })),
        ).rejects.toThrow(CannotUpdateOwnRoleError);
      });

      it('does not call updateMembershipRole', async () => {
        await useCase
          .execute(buildCommand({ targetUserId: userId }))
          .catch(() => {});

        expect(membershipService.updateMembershipRole).not.toHaveBeenCalled();
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
