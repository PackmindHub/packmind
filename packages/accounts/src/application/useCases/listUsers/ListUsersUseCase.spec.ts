import { ListUsersUseCase } from './ListUsersUseCase';
import { UserService } from '../../services/UserService';
import { createUserId } from '../../../domain/entities/User';
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
      getUserByUsername: jest.fn(),
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
      it('returns all users wrapped in response object', async () => {
        const mockUsers = [
          userFactory({
            id: createUserId('user-1'),
            username: 'user1',
          }),
          userFactory({
            id: createUserId('user-2'),
            username: 'user2',
          }),
        ];

        mockUserService.listUsers.mockResolvedValue(mockUsers);

        const command: ListUsersCommand = {};

        const result = await listUsersUseCase.execute(command);

        expect(result).toEqual({ users: mockUsers });
        expect(mockUserService.listUsers).toHaveBeenCalledWith();
      });
    });

    describe('when no users exist in the system', () => {
      it('returns empty array wrapped in response object', async () => {
        mockUserService.listUsers.mockResolvedValue([]);

        const command: ListUsersCommand = {};

        const result = await listUsersUseCase.execute(command);

        expect(result).toEqual({ users: [] });
        expect(mockUserService.listUsers).toHaveBeenCalledWith();
      });
    });

    describe('when user service fails', () => {
      it('throws the error from user service', async () => {
        const error = new Error('Database error');
        mockUserService.listUsers.mockRejectedValue(error);

        const command: ListUsersCommand = {};

        await expect(listUsersUseCase.execute(command)).rejects.toThrow(error);
      });
    });
  });
});
