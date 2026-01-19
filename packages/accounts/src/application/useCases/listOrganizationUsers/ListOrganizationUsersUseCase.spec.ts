import { PackmindLogger } from '@packmind/logger';
import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ListOrganizationUsersCommand,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { UserService } from '../../services/UserService';
import { ListOrganizationUsersUseCase } from './ListOrganizationUsersUseCase';

describe('ListOrganizationUsersUseCase', () => {
  let listOrganizationUsersUseCase: ListOrganizationUsersUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockUserService: jest.Mocked<UserService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockUserService = {
      listUsersByOrganization: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    stubbedLogger = stubLogger();

    listOrganizationUsersUseCase = new ListOrganizationUsersUseCase(
      mockAccountsPort,
      mockUserService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    const userId = createUserId('user-123');
    const organizationId = createOrganizationId('org-456');
    const user = userFactory({ id: userId });
    const organization = organizationFactory({ id: organizationId });
    const membership = {
      userId,
      organizationId,
      role: 'member' as const,
    };

    const validCommand: ListOrganizationUsersCommand & MemberContext = {
      userId: String(userId),
      organizationId,
      user,
      organization,
      membership,
    };

    describe('with valid organization containing multiple users', () => {
      const user1Id = createUserId('user-1');
      const user2Id = createUserId('user-2');
      const user3Id = createUserId('user-3');

      let mockUsers: ReturnType<typeof userFactory>[];

      beforeEach(() => {
        mockUsers = [
          userFactory({
            id: user1Id,
            email: 'admin@example.com',
            memberships: [
              {
                userId: user1Id,
                organizationId,
                role: 'admin',
              },
            ],
          }),
          userFactory({
            id: user2Id,
            email: 'member@example.com',
            memberships: [
              {
                userId: user2Id,
                organizationId,
                role: 'member',
              },
            ],
          }),
          userFactory({
            id: user3Id,
            email: 'viewer@example.com',
            memberships: [
              {
                userId: user3Id,
                organizationId,
                role: 'member',
              },
            ],
          }),
        ];

        mockUserService.listUsersByOrganization.mockResolvedValue(mockUsers);
      });

      it('returns list of users with their roles', async () => {
        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({
          users: [
            { userId: user1Id, email: 'admin@example.com', role: 'admin' },
            { userId: user2Id, email: 'member@example.com', role: 'member' },
            { userId: user3Id, email: 'viewer@example.com', role: 'member' },
          ],
        });
      });

      it('calls user service with organization id', async () => {
        await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('with user missing membership for organization', () => {
      it('returns user with default member role', async () => {
        const user1Id = createUserId('user-1');

        const mockUsers = [
          userFactory({
            id: user1Id,
            email: 'user@example.com',
            memberships: [],
          }),
        ];

        mockUserService.listUsersByOrganization.mockResolvedValue(mockUsers);

        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({
          users: [
            { userId: user1Id, email: 'user@example.com', role: 'member' },
          ],
        });
      });
    });

    describe('with user having undefined memberships', () => {
      it('returns user with default member role', async () => {
        const user1Id = createUserId('user-1');

        const mockUsers = [
          userFactory({
            id: user1Id,
            email: 'user@example.com',
            memberships: undefined,
          }),
        ];

        mockUserService.listUsersByOrganization.mockResolvedValue(mockUsers);

        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({
          users: [
            { userId: user1Id, email: 'user@example.com', role: 'member' },
          ],
        });
      });
    });

    describe('with service error', () => {
      const serviceError = new Error('Database connection failed');

      beforeEach(() => {
        mockUserService.listUsersByOrganization.mockRejectedValue(serviceError);
      });

      it('rethrows error', async () => {
        await expect(
          listOrganizationUsersUseCase.executeForMembers(validCommand),
        ).rejects.toThrow('Database connection failed');
      });

      it('calls user service with organization id', async () => {
        await listOrganizationUsersUseCase
          .executeForMembers(validCommand)
          .catch(() => {
            // Expected to throw - catch to verify side effects
          });

        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('with non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Service unavailable';
        mockUserService.listUsersByOrganization.mockRejectedValue(serviceError);

        await expect(
          listOrganizationUsersUseCase.executeForMembers(validCommand),
        ).rejects.toBe('Service unavailable');
      });
    });

    describe('with network timeout error', () => {
      const timeoutError = new Error('Request timeout');

      beforeEach(() => {
        mockUserService.listUsersByOrganization.mockRejectedValue(timeoutError);
      });

      it('rethrows timeout error', async () => {
        await expect(
          listOrganizationUsersUseCase.executeForMembers(validCommand),
        ).rejects.toThrow('Request timeout');
      });

      it('calls user service with organization id', async () => {
        await listOrganizationUsersUseCase
          .executeForMembers(validCommand)
          .catch(() => {
            // Expected to throw - catch to verify side effects
          });

        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('with empty organization', () => {
      beforeEach(() => {
        mockUserService.listUsersByOrganization.mockResolvedValue([]);
      });

      it('returns empty array', async () => {
        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({ users: [] });
      });

      it('calls user service with organization id', async () => {
        await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('with single user in organization', () => {
      const user1Id = createUserId('single-user');

      let mockUsers: ReturnType<typeof userFactory>[];

      beforeEach(() => {
        mockUsers = [
          userFactory({
            id: user1Id,
            email: 'single@example.com',
            memberships: [
              {
                userId: user1Id,
                organizationId,
                role: 'admin',
              },
            ],
          }),
        ];

        mockUserService.listUsersByOrganization.mockResolvedValue(mockUsers);
      });

      it('returns single user with role', async () => {
        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({
          users: [
            { userId: user1Id, email: 'single@example.com', role: 'admin' },
          ],
        });
      });

      it('calls user service with organization id', async () => {
        await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });
  });
});
