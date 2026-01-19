import { stubLogger } from '@packmind/test-utils';
import {
  ChangeUserRoleCommand,
  createOrganizationId,
  createUserId,
  IAccountsPort,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { organizationFactory, userFactory } from '../../../../test';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from '../../../domain/errors';
import { UserService } from '../../services/UserService';
import { ChangeUserRoleUseCase } from './ChangeUserRoleUseCase';

describe('ChangeUserRoleUseCase', () => {
  let useCase: ChangeUserRoleUseCase;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockChangeUserRole: jest.Mock;
  let mockListUsers: jest.Mock;
  let userService: jest.Mocked<UserService>;
  const mockLogger = stubLogger();

  const adminUserId = uuidv4();
  const targetUserId = uuidv4();
  const organizationId = uuidv4();

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockChangeUserRole = jest.fn();
    mockListUsers = jest.fn();

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    userService = {
      getUserById: mockGetUserById,
      changeUserRole: mockChangeUserRole,
      listUsers: mockListUsers,
    } as unknown as jest.Mocked<UserService>;

    const organization = organizationFactory({
      id: createOrganizationId(organizationId),
    });
    mockGetOrganizationById.mockResolvedValue(organization);

    useCase = new ChangeUserRoleUseCase(accountsPort, userService, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (
    newRole: 'admin' | 'member' = 'admin',
  ): ChangeUserRoleCommand => ({
    userId: adminUserId,
    organizationId,
    targetUserId: createUserId(targetUserId),
    newRole,
  });

  const createAdminUser = () =>
    userFactory({
      id: createUserId(adminUserId),
      memberships: [
        {
          userId: createUserId(adminUserId),
          organizationId: createOrganizationId(organizationId),
          role: 'admin',
        },
      ],
    });

  const createTargetUser = (role: 'admin' | 'member' = 'member') =>
    userFactory({
      id: createUserId(targetUserId),
      memberships: [
        {
          userId: createUserId(targetUserId),
          organizationId: createOrganizationId(organizationId),
          role,
        },
      ],
    });

  describe('execute', () => {
    describe('when admin changes member to admin', () => {
      let result: { success: boolean; updatedRole: string };

      beforeEach(async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('member');
        const command = createCommand('admin');

        mockGetUserById
          .mockResolvedValueOnce(adminUser)
          .mockResolvedValueOnce(targetUser);
        mockChangeUserRole.mockResolvedValue(true);

        result = await useCase.execute(command);
      });

      it('returns success with updated role', () => {
        expect(result).toEqual({
          success: true,
          updatedRole: 'admin',
        });
      });

      it('calls changeUserRole with correct parameters', () => {
        expect(mockChangeUserRole).toHaveBeenCalledWith(
          createUserId(targetUserId),
          createOrganizationId(organizationId),
          'admin',
        );
      });
    });

    describe('when admin changes admin to member with multiple admins', () => {
      let result: { success: boolean; updatedRole: string };

      beforeEach(async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('admin');
        const command = createCommand('member');

        const otherAdmin = userFactory({
          id: createUserId(uuidv4()),
          memberships: [
            {
              userId: createUserId(uuidv4()),
              organizationId: createOrganizationId(organizationId),
              role: 'admin',
            },
          ],
        });

        mockGetUserById
          .mockResolvedValueOnce(adminUser)
          .mockResolvedValueOnce(targetUser);
        mockListUsers.mockResolvedValue([adminUser, targetUser, otherAdmin]);
        mockChangeUserRole.mockResolvedValue(true);

        result = await useCase.execute(command);
      });

      it('returns success with updated role', () => {
        expect(result).toEqual({
          success: true,
          updatedRole: 'member',
        });
      });

      it('calls changeUserRole with correct parameters', () => {
        expect(mockChangeUserRole).toHaveBeenCalledWith(
          createUserId(targetUserId),
          createOrganizationId(organizationId),
          'member',
        );
      });
    });

    describe('when admin tries to change their own role', () => {
      const createSelfCommand = (): ChangeUserRoleCommand => ({
        userId: adminUserId,
        organizationId,
        targetUserId: createUserId(adminUserId),
        newRole: 'member',
      });

      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);
      });

      it('throws error preventing self-role modification', async () => {
        await expect(useCase.execute(createSelfCommand())).rejects.toThrow(
          'Cannot change your own role',
        );
      });

      it('does not call changeUserRole', async () => {
        try {
          await useCase.execute(createSelfCommand());
        } catch {
          // Expected to throw
        }

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when target user does not exist', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById
          .mockResolvedValueOnce(adminUser)
          .mockResolvedValueOnce(null);
      });

      it('throws UserNotFoundError', async () => {
        await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
          UserNotFoundError,
        );
      });

      it('does not call changeUserRole', async () => {
        try {
          await useCase.execute(createCommand());
        } catch {
          // Expected to throw
        }

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when target user is not a member of the organization', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        const targetUserDifferentOrg = userFactory({
          id: createUserId(targetUserId),
          memberships: [
            {
              userId: createUserId(targetUserId),
              organizationId: createOrganizationId(uuidv4()),
              role: 'member',
            },
          ],
        });

        mockGetUserById
          .mockResolvedValueOnce(adminUser)
          .mockResolvedValueOnce(targetUserDifferentOrg);
      });

      it('throws UserNotInOrganizationError', async () => {
        await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );
      });

      it('does not call changeUserRole', async () => {
        try {
          await useCase.execute(createCommand());
        } catch {
          // Expected to throw
        }

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when target user has no memberships', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        const targetUserNoMemberships = userFactory({
          id: createUserId(targetUserId),
          memberships: [],
        });

        mockGetUserById
          .mockResolvedValueOnce(adminUser)
          .mockResolvedValueOnce(targetUserNoMemberships);
      });

      it('throws UserNotInOrganizationError', async () => {
        await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );
      });

      it('does not call changeUserRole', async () => {
        try {
          await useCase.execute(createCommand());
        } catch {
          // Expected to throw
        }

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when trying to demote the last admin', () => {
      describe('when only one admin exists', () => {
        beforeEach(() => {
          const adminUser = createAdminUser();
          const targetUser = createTargetUser('admin');
          const memberUser = userFactory({
            id: createUserId(uuidv4()),
            memberships: [
              {
                userId: createUserId(uuidv4()),
                organizationId: createOrganizationId(organizationId),
                role: 'member',
              },
            ],
          });

          mockGetUserById
            .mockResolvedValueOnce(adminUser)
            .mockResolvedValueOnce(targetUser);
          mockListUsers.mockResolvedValue([targetUser, memberUser]);
          mockChangeUserRole.mockResolvedValue(false);
        });

        it('throws error preventing organization lockout', async () => {
          await expect(
            useCase.execute(createCommand('member')),
          ).rejects.toThrow(
            'Cannot demote the last administrator of the organization',
          );
        });

        it('does not call changeUserRole', async () => {
          try {
            await useCase.execute(createCommand('member'));
          } catch {
            // Expected to throw
          }

          expect(mockChangeUserRole).not.toHaveBeenCalled();
        });
      });

      describe('when multiple admins exist', () => {
        let result: { success: boolean; updatedRole: string };

        beforeEach(async () => {
          const adminUser = createAdminUser();
          const targetUser = createTargetUser('admin');
          const anotherAdmin = userFactory({
            id: createUserId(uuidv4()),
            memberships: [
              {
                userId: createUserId(uuidv4()),
                organizationId: createOrganizationId(organizationId),
                role: 'admin',
              },
            ],
          });

          mockGetUserById
            .mockResolvedValueOnce(adminUser)
            .mockResolvedValueOnce(targetUser);
          mockListUsers.mockResolvedValue([
            adminUser,
            targetUser,
            anotherAdmin,
          ]);
          mockChangeUserRole.mockResolvedValue(true);

          result = await useCase.execute(createCommand('member'));
        });

        it('allows demotion and returns success', () => {
          expect(result).toEqual({
            success: true,
            updatedRole: 'member',
          });
        });

        it('calls changeUserRole with correct parameters', () => {
          expect(mockChangeUserRole).toHaveBeenCalledWith(
            createUserId(targetUserId),
            createOrganizationId(organizationId),
            'member',
          );
        });
      });
    });

    describe('when promoting member to admin', () => {
      let result: { success: boolean; updatedRole: string };

      beforeEach(async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('member');

        mockGetUserById
          .mockResolvedValueOnce(adminUser)
          .mockResolvedValueOnce(targetUser);
        mockChangeUserRole.mockResolvedValue(true);

        result = await useCase.execute(createCommand('admin'));
      });

      it('returns success with updated role', () => {
        expect(result).toEqual({
          success: true,
          updatedRole: 'admin',
        });
      });

      it('does not check admin count', () => {
        expect(mockListUsers).not.toHaveBeenCalled();
      });

      it('calls changeUserRole with correct parameters', () => {
        expect(mockChangeUserRole).toHaveBeenCalledWith(
          createUserId(targetUserId),
          createOrganizationId(organizationId),
          'admin',
        );
      });
    });

    describe('when service fails to update role', () => {
      it('throws error', async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('member');
        const command = createCommand('admin');

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockChangeUserRole.mockResolvedValue(false); // Service fails

        await expect(useCase.execute(command)).rejects.toThrow(
          'Failed to update user role',
        );
      });
    });

    describe('when service throws an error', () => {
      it('propagates the error', async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('member');
        const command = createCommand('admin');

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockChangeUserRole.mockRejectedValue(new Error('Database error'));

        await expect(useCase.execute(command)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });
});
