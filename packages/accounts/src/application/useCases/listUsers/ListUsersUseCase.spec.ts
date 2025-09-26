import { ListUsersUseCase } from './ListUsersUseCase';
import { UserService } from '../../services/UserService';
import { createUserId } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { userFactory } from '../../../../test';
import { ListUsersCommand } from '../../../domain/useCases/IListUsersUseCase';

describe('ListUsersUseCase', () => {
  let listUsersUseCase: ListUsersUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserService = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      hashPassword: jest.fn(),
      validatePassword: jest.fn(),
      listUsers: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    stubbedLogger = stubLogger();

    listUsersUseCase = new ListUsersUseCase(mockUserService, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when users exist in the system', () => {
      it('returns only users belonging to the organization', async () => {
        const organizationId = createOrganizationId('org-1');
        const otherOrganizationId = createOrganizationId('org-2');
        const firstUserId = createUserId('user-1');
        const secondUserId = createUserId('user-2');
        const mockUsers = [
          userFactory({
            id: firstUserId,
            email: 'user1@packmind.com',
            memberships: [
              {
                userId: firstUserId,
                organizationId,
                role: 'admin',
              },
            ],
          }),
          userFactory({
            id: secondUserId,
            email: 'user2@packmind.com',
            memberships: [
              {
                userId: secondUserId,
                organizationId: otherOrganizationId,
                role: 'admin',
              },
            ],
          }),
        ];

        mockUserService.listUsers.mockResolvedValue(mockUsers);

        const command: ListUsersCommand = {
          userId: createUserId('requesting-user'),
          organizationId,
        };

        const result = await listUsersUseCase.execute(command);

        const expectedUsers = [
          {
            active: true,
            id: firstUserId,
            email: 'user1@packmind.com',
          },
        ];

        expect(result).toEqual({ users: expectedUsers });
        expect(mockUserService.listUsers).toHaveBeenCalledWith();
      });
    });

    describe('when no users exist in the system', () => {
      it('returns empty array wrapped in response object', async () => {
        const organizationId = createOrganizationId('org-1');
        const otherOrganizationId = createOrganizationId('org-2');
        const onlyUserId = createUserId('user-1');
        mockUserService.listUsers.mockResolvedValue([
          userFactory({
            id: onlyUserId,
            email: 'other@packmind.com',
            memberships: [
              {
                userId: onlyUserId,
                organizationId: otherOrganizationId,
                role: 'admin',
              },
            ],
          }),
        ]);

        const command: ListUsersCommand = {
          userId: createUserId('requesting-user'),
          organizationId,
        };

        const result = await listUsersUseCase.execute(command);

        expect(result).toEqual({ users: [] });
        expect(mockUserService.listUsers).toHaveBeenCalledWith();
      });
    });

    describe('when user service fails', () => {
      it('throws the error from user service', async () => {
        const error = new Error('Database error');
        mockUserService.listUsers.mockRejectedValue(error);

        const command: ListUsersCommand = {
          userId: createUserId('requesting-user'),
          organizationId: createOrganizationId('org-1'),
        };

        await expect(listUsersUseCase.execute(command)).rejects.toThrow(error);
      });
    });
  });
});
