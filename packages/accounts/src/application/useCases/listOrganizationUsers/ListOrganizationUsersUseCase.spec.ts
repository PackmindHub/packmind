import { ListOrganizationUsersUseCase } from './ListOrganizationUsersUseCase';
import { ListOrganizationUsersCommand } from '../../../domain/useCases/IListOrganizationUsersUseCase';
import { stubLogger } from '@packmind/shared/test';
import {
  PackmindLogger,
  UserProvider,
  OrganizationProvider,
  MemberContext,
} from '@packmind/shared';
import { UserService } from '../../services/UserService';
import { userFactory, organizationFactory } from '../../../../test';
import { createUserId } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';

describe('ListOrganizationUsersUseCase', () => {
  let listOrganizationUsersUseCase: ListOrganizationUsersUseCase;
  let mockUserProvider: jest.Mocked<UserProvider>;
  let mockOrganizationProvider: jest.Mocked<OrganizationProvider>;
  let mockUserService: jest.Mocked<UserService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserProvider = {
      getUserById: jest.fn(),
    } as unknown as jest.Mocked<UserProvider>;

    mockOrganizationProvider = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationProvider>;

    mockUserService = {
      listUsersByOrganization: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    stubbedLogger = stubLogger();

    listOrganizationUsersUseCase = new ListOrganizationUsersUseCase(
      mockUserProvider,
      mockOrganizationProvider,
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
      it('returns list of users with their roles', async () => {
        const user1Id = createUserId('user-1');
        const user2Id = createUserId('user-2');
        const user3Id = createUserId('user-3');

        const mockUsers = [
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

        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({
          users: [
            { userId: user1Id, email: 'admin@example.com', role: 'admin' },
            { userId: user2Id, email: 'member@example.com', role: 'member' },
            { userId: user3Id, email: 'viewer@example.com', role: 'member' },
          ],
        });
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
      it('rethrows error', async () => {
        const serviceError = new Error('Database connection failed');
        mockUserService.listUsersByOrganization.mockRejectedValue(serviceError);

        await expect(
          listOrganizationUsersUseCase.executeForMembers(validCommand),
        ).rejects.toThrow('Database connection failed');

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
      it('rethrows timeout error', async () => {
        const timeoutError = new Error('Request timeout');
        mockUserService.listUsersByOrganization.mockRejectedValue(timeoutError);

        await expect(
          listOrganizationUsersUseCase.executeForMembers(validCommand),
        ).rejects.toThrow('Request timeout');

        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('with empty organization', () => {
      it('returns empty array', async () => {
        mockUserService.listUsersByOrganization.mockResolvedValue([]);

        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({ users: [] });
        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('with single user in organization', () => {
      it('returns single user with role', async () => {
        const user1Id = createUserId('single-user');

        const mockUsers = [
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

        const result =
          await listOrganizationUsersUseCase.executeForMembers(validCommand);

        expect(result).toEqual({
          users: [
            { userId: user1Id, email: 'single@example.com', role: 'admin' },
          ],
        });
        expect(mockUserService.listUsersByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });
  });
});
