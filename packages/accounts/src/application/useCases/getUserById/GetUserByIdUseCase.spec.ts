import { GetUserByIdUseCase } from './GetUserByIdUseCase';
import { UserService } from '../../services/UserService';
import { createUserId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { userFactory } from '../../../../test';
import { GetUserByIdCommand } from '@packmind/types';

describe('GetUserByIdUseCase', () => {
  let getUserByIdUseCase: GetUserByIdUseCase;
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

    getUserByIdUseCase = new GetUserByIdUseCase(mockUserService, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when a valid user ID', () => {
      const userId = createUserId('user-123');
      let mockUser: ReturnType<typeof userFactory>;
      let command: GetUserByIdCommand;

      beforeEach(() => {
        mockUser = userFactory({
          id: userId,
          email: 'testuser@packmind.com',
        });
        mockUserService.getUserById.mockResolvedValue(mockUser);
        command = { userId };
      });

      it('returns the user wrapped in response object', async () => {
        const result = await getUserByIdUseCase.execute(command);

        expect(result).toEqual({ user: mockUser });
      });

      it('calls user service with the user ID', async () => {
        await getUserByIdUseCase.execute(command);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      });
    });

    describe('when a non-existent user ID', () => {
      const userId = createUserId('non-existent');
      let command: GetUserByIdCommand;

      beforeEach(() => {
        mockUserService.getUserById.mockResolvedValue(null);
        command = { userId };
      });

      it('returns null user in response object', async () => {
        const result = await getUserByIdUseCase.execute(command);

        expect(result).toEqual({ user: null });
      });

      it('calls user service with the user ID', async () => {
        await getUserByIdUseCase.execute(command);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      });
    });

    describe('when user service fails', () => {
      it('throws the error from user service', async () => {
        const error = new Error('Database error');
        mockUserService.getUserById.mockRejectedValue(error);

        const command: GetUserByIdCommand = {
          userId: createUserId('user-123'),
        };

        await expect(getUserByIdUseCase.execute(command)).rejects.toThrow(
          error,
        );
      });
    });
  });
});
