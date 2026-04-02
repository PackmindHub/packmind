import {
  AddMembersToSpaceCommand,
  IAccountsPort,
  createOrganizationId,
  createSpaceId,
  createUserId,
  UserSpaceRole,
} from '@packmind/types';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { userSpaceMembershipFactory } from '@packmind/spaces/test/userSpaceMembershipFactory';
import { stubLogger } from '@packmind/test-utils';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';
import { AddMembersToSpaceUseCase } from './AddMembersToSpaceUseCase';

describe('AddMembersToSpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'admin' }],
  });

  let useCase: AddMembersToSpaceUseCase;
  let membershipService: jest.Mocked<UserSpaceMembershipService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  const buildCommand = (
    overrides?: Partial<AddMembersToSpaceCommand>,
  ): AddMembersToSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    members: [
      { userId: createUserId('member-1'), role: UserSpaceRole.MEMBER },
      { userId: createUserId('member-2'), role: UserSpaceRole.ADMIN },
    ],
    ...overrides,
  });

  beforeEach(() => {
    membershipService = {
      addSpaceMembership: jest.fn(),
    } as unknown as jest.Mocked<UserSpaceMembershipService>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new AddMembersToSpaceUseCase(
      membershipService,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when members are added successfully', () => {
      const membership1 = userSpaceMembershipFactory({
        userId: createUserId('member-1'),
        spaceId,
        role: UserSpaceRole.MEMBER,
      });
      const membership2 = userSpaceMembershipFactory({
        userId: createUserId('member-2'),
        spaceId,
        role: UserSpaceRole.ADMIN,
      });

      beforeEach(() => {
        membershipService.addSpaceMembership
          .mockResolvedValueOnce(membership1)
          .mockResolvedValueOnce(membership2);
      });

      it('returns all created memberships', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual([membership1, membership2]);
      });

      it('calls addSpaceMembership for each member', async () => {
        await useCase.execute(buildCommand());

        expect(membershipService.addSpaceMembership).toHaveBeenCalledTimes(2);
      });
    });

    describe('when one member fails to be added', () => {
      const membership1 = userSpaceMembershipFactory({
        userId: createUserId('member-1'),
        spaceId,
        role: UserSpaceRole.MEMBER,
      });

      beforeEach(() => {
        membershipService.addSpaceMembership
          .mockResolvedValueOnce(membership1)
          .mockRejectedValueOnce(new Error('duplicate key'));
      });

      it('returns only the successful memberships', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual([membership1]);
      });
    });

    describe('when all members fail to be added', () => {
      beforeEach(() => {
        membershipService.addSpaceMembership.mockRejectedValue(
          new Error('duplicate key'),
        );
      });

      it('returns an empty array', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual([]);
      });
    });

    describe('when members array is empty', () => {
      it('returns an empty array', async () => {
        const result = await useCase.execute(buildCommand({ members: [] }));

        expect(result).toEqual([]);
      });

      it('does not call addSpaceMembership', async () => {
        await useCase.execute(buildCommand({ members: [] }));

        expect(membershipService.addSpaceMembership).not.toHaveBeenCalled();
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

    describe('when the user is a member but not an admin', () => {
      beforeEach(() => {
        accountsPort.getUserById.mockResolvedValue(
          userFactory({
            id: userId,
            memberships: [{ userId, organizationId, role: 'member' }],
          }),
        );
      });

      it('throws OrganizationAdminRequiredError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          OrganizationAdminRequiredError,
        );
      });
    });
  });
});
