import { stubLogger } from '@packmind/shared/test';
import { ChangeUserRoleUseCase } from './ChangeUserRoleUseCase';
import { ChangeUserRoleCommand } from '@packmind/shared';
import { createUserId } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';
import { organizationFactory, userFactory } from '../../../../test';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from '../../../domain/errors';

describe('ChangeUserRoleUseCase', () => {
  let useCase: ChangeUserRoleUseCase;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockChangeUserRole: jest.Mock;
  let mockListUsers: jest.Mock;
  let userService: jest.Mocked<UserService>;
  let organizationService: jest.Mocked<OrganizationService>;
  const mockLogger = stubLogger();

  const adminUserId = uuidv4();
  const targetUserId = uuidv4();
  const organizationId = uuidv4();

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockChangeUserRole = jest.fn();
    mockListUsers = jest.fn();

    userService = {
      getUserById: mockGetUserById,
      changeUserRole: mockChangeUserRole,
      listUsers: mockListUsers,
    } as unknown as jest.Mocked<UserService>;

    organizationService = {
      getOrganizationById: mockGetOrganizationById,
    } as unknown as jest.Mocked<OrganizationService>;

    const organization = organizationFactory({
      id: createOrganizationId(organizationId),
    });
    mockGetOrganizationById.mockResolvedValue(organization);

    useCase = new ChangeUserRoleUseCase(
      userService,
      organizationService,
      userService,
      mockLogger,
    );
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
    describe('when admin changes another user role successfully', () => {
      it('changes member to admin and returns success', async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('member');
        const command = createCommand('admin');

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockChangeUserRole.mockResolvedValue(true);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          success: true,
          updatedRole: 'admin',
        });
        expect(mockChangeUserRole).toHaveBeenCalledWith(
          createUserId(targetUserId),
          createOrganizationId(organizationId),
          'admin',
        );
      });

      it('changes admin to member and returns success', async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('admin');
        const command = createCommand('member');

        // Mock multiple admins to prevent last admin protection
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
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockListUsers.mockResolvedValue([adminUser, targetUser, otherAdmin]);
        mockChangeUserRole.mockResolvedValue(true);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          success: true,
          updatedRole: 'member',
        });
        expect(mockChangeUserRole).toHaveBeenCalledWith(
          createUserId(targetUserId),
          createOrganizationId(organizationId),
          'member',
        );
      });
    });

    describe('when admin tries to change their own role', () => {
      it('throws error preventing self-role modification', async () => {
        const adminUser = createAdminUser();
        const command: ChangeUserRoleCommand = {
          userId: adminUserId,
          organizationId,
          targetUserId: createUserId(adminUserId), // Same as userId
          newRole: 'member',
        };

        mockGetUserById.mockResolvedValueOnce(adminUser);

        await expect(useCase.execute(command)).rejects.toThrow(
          'Cannot change your own role',
        );

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when target user does not exist', () => {
      it('throws error', async () => {
        const adminUser = createAdminUser();
        const command = createCommand();

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(null); // Target user not found

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotFoundError,
        );

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when target user is not a member of the organization', () => {
      it('throws error', async () => {
        const adminUser = createAdminUser();
        const targetUserDifferentOrg = userFactory({
          id: createUserId(targetUserId),
          memberships: [
            {
              userId: createUserId(targetUserId),
              organizationId: createOrganizationId(uuidv4()), // Different org
              role: 'member',
            },
          ],
        });
        const command = createCommand();

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUserDifferentOrg); // Target user in different org

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when target user has no memberships', () => {
      it('throws error', async () => {
        const adminUser = createAdminUser();
        const targetUserNoMemberships = userFactory({
          id: createUserId(targetUserId),
          memberships: [],
        });
        const command = createCommand();

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUserNoMemberships); // Target user with no memberships

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });
    });

    describe('when trying to demote the last admin', () => {
      it('throws error preventing organization lockout', async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('admin');
        const command = createCommand('member');

        // Mock only one admin in the organization (targetUser is the only admin)
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
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockListUsers.mockResolvedValue([targetUser, memberUser]); // Only targetUser is admin
        mockChangeUserRole.mockResolvedValue(false); // Should not be called, but set for safety

        await expect(useCase.execute(command)).rejects.toThrow(
          'Cannot demote the last administrator of the organization',
        );

        expect(mockChangeUserRole).not.toHaveBeenCalled();
      });

      it('allows demotion if multiple admins exist', async () => {
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
        const command = createCommand('member');

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockListUsers.mockResolvedValue([adminUser, targetUser, anotherAdmin]); // Multiple admins
        mockChangeUserRole.mockResolvedValue(true);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          success: true,
          updatedRole: 'member',
        });
        expect(mockChangeUserRole).toHaveBeenCalledWith(
          createUserId(targetUserId),
          createOrganizationId(organizationId),
          'member',
        );
      });
    });

    describe('when promoting member to admin', () => {
      it('does not check admin count and executes successfully', async () => {
        const adminUser = createAdminUser();
        const targetUser = createTargetUser('member');
        const command = createCommand('admin');

        mockGetUserById
          .mockResolvedValueOnce(adminUser) // Admin validation
          .mockResolvedValueOnce(targetUser); // Target user lookup
        mockChangeUserRole.mockResolvedValue(true);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          success: true,
          updatedRole: 'admin',
        });
        expect(mockListUsers).not.toHaveBeenCalled(); // No admin count check needed
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
