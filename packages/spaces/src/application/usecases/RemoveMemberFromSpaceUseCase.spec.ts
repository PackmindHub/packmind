import {
  RemoveMemberFromSpaceCommand,
  IAccountsPort,
  createOrganizationId,
  createSpaceId,
  createUserId,
  UserSpaceRole,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { userSpaceMembershipFactory } from '@packmind/spaces/test/userSpaceMembershipFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { SpaceAdminRequiredError } from '../../domain/errors/SpaceAdminRequiredError';
import { CannotRemoveFromDefaultSpaceError } from '../../domain/errors/CannotRemoveFromDefaultSpaceError';
import { CannotRemoveSelfError } from '../../domain/errors/CannotRemoveSelfError';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import { RemoveMemberFromSpaceUseCase } from './RemoveMemberFromSpaceUseCase';

describe('RemoveMemberFromSpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('admin-user-id');
  const targetUserId = createUserId('target-user-id');
  const spaceId = createSpaceId('space-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'admin' }],
  });

  let useCase: RemoveMemberFromSpaceUseCase;
  let membershipService: jest.Mocked<UserSpaceMembershipService>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const buildCommand = (
    overrides?: Partial<RemoveMemberFromSpaceCommand>,
  ): RemoveMemberFromSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    targetUserId,
    ...overrides,
  });

  beforeEach(() => {
    membershipService = {
      findMembership: jest.fn(),
      getSpaceById: jest.fn(),
      removeSpaceMembership: jest.fn(),
    } as unknown as jest.Mocked<UserSpaceMembershipService>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };

    useCase = new RemoveMemberFromSpaceUseCase(
      membershipService,
      accountsPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the member is removed successfully', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(
          userSpaceMembershipFactory({
            userId,
            spaceId,
            role: UserSpaceRole.ADMIN,
          }),
        );
        membershipService.getSpaceById.mockResolvedValue(
          spaceFactory({ id: spaceId, isDefaultSpace: false }),
        );
        membershipService.removeSpaceMembership.mockResolvedValue(true);
      });

      it('returns removed true', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual({ removed: true });
      });

      it('calls removeSpaceMembership with the target user', async () => {
        await useCase.execute(buildCommand());

        expect(membershipService.removeSpaceMembership).toHaveBeenCalledWith(
          targetUserId,
          spaceId,
        );
      });

      it('emits SpaceMembersRemovedEvent', async () => {
        await useCase.execute(buildCommand());

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              spaceId,
              memberUserIds: [targetUserId],
            }),
          }),
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

      it('does not call removeSpaceMembership', async () => {
        await useCase.execute(buildCommand()).catch(() => {
          /* expected */
        });

        expect(membershipService.removeSpaceMembership).not.toHaveBeenCalled();
      });

      it('does not emit SpaceMembersRemovedEvent', async () => {
        await useCase.execute(buildCommand()).catch(() => undefined);

        expect(eventEmitterService.emit).not.toHaveBeenCalled();
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

    describe('when the space is a default space', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(
          userSpaceMembershipFactory({
            userId,
            spaceId,
            role: UserSpaceRole.ADMIN,
          }),
        );
        membershipService.getSpaceById.mockResolvedValue(
          spaceFactory({ id: spaceId, isDefaultSpace: true }),
        );
      });

      it('throws CannotRemoveFromDefaultSpaceError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          CannotRemoveFromDefaultSpaceError,
        );
      });

      it('does not call removeSpaceMembership', async () => {
        await useCase.execute(buildCommand()).catch(() => {
          /* expected */
        });

        expect(membershipService.removeSpaceMembership).not.toHaveBeenCalled();
      });
    });

    describe('when the caller tries to remove themselves', () => {
      beforeEach(() => {
        membershipService.findMembership.mockResolvedValue(
          userSpaceMembershipFactory({
            userId,
            spaceId,
            role: UserSpaceRole.ADMIN,
          }),
        );
        membershipService.getSpaceById.mockResolvedValue(
          spaceFactory({ id: spaceId, isDefaultSpace: false }),
        );
      });

      it('throws CannotRemoveSelfError', async () => {
        await expect(
          useCase.execute(buildCommand({ targetUserId: userId })),
        ).rejects.toThrow(CannotRemoveSelfError);
      });

      it('does not call removeSpaceMembership', async () => {
        await useCase
          .execute(buildCommand({ targetUserId: userId }))
          .catch(() => {
            /* expected */
          });

        expect(membershipService.removeSpaceMembership).not.toHaveBeenCalled();
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
