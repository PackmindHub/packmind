import { GetUserByUsernameUseCase } from './GetUserByUsernameUseCase';
import { UserService } from '../../services/UserService';
import { createUserId } from '../../../domain/entities/User';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { userFactory } from '../../../../test';
import { GetUserByUsernameCommand } from '../../../domain/useCases/IGetUserByUsernameUseCase';

describe('GetUserByUsernameUseCase', () => {
  let getUserByUsernameUseCase: GetUserByUsernameUseCase;
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

    getUserByUsernameUseCase = new GetUserByUsernameUseCase(
      mockUserService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when a valid username', () => {
      it('returns the user wrapped in response object', async () => {
        const mockUser = userFactory({
          id: createUserId('user-123'),
          username: 'testuser',
        });

        mockUserService.getUserByUsername.mockResolvedValue(mockUser);

        const command: GetUserByUsernameCommand = {
          username: 'testuser',
        };

        const result = await getUserByUsernameUseCase.execute(command);

        expect(result).toEqual({ user: mockUser });
        expect(mockUserService.getUserByUsername).toHaveBeenCalledWith(
          command.username,
        );
      });
    });

    describe('when a non-existent username', () => {
      it('returns null user in response object', async () => {
        mockUserService.getUserByUsername.mockResolvedValue(null);

        const command: GetUserByUsernameCommand = {
          username: 'non-existent',
        };

        const result = await getUserByUsernameUseCase.execute(command);

        expect(result).toEqual({ user: null });
        expect(mockUserService.getUserByUsername).toHaveBeenCalledWith(
          command.username,
        );
      });
    });

    describe('when user service fails', () => {
      it('throws the error from user service', async () => {
        const error = new Error('Database error');
        mockUserService.getUserByUsername.mockRejectedValue(error);

        const command: GetUserByUsernameCommand = {
          username: 'testuser',
        };

        await expect(getUserByUsernameUseCase.execute(command)).rejects.toThrow(
          error,
        );
      });
    });
  });
});
