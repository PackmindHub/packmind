import { GetUserByIdUseCase } from './GetUserByIdUseCase';
import { UserService } from '../../services/UserService';
import { createUserId } from '../../../domain/entities/User';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { userFactory } from '../../../../test';
import { GetUserByIdCommand } from '@packmind/shared';

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
      it('returns the user wrapped in response object', async () => {
        const mockUser = userFactory({
          id: createUserId('user-123'),
          email: 'testuser@packmind.com',
        });

        mockUserService.getUserById.mockResolvedValue(mockUser);

        const command: GetUserByIdCommand = {
          userId: createUserId('user-123'),
        };

        const result = await getUserByIdUseCase.execute(command);

        expect(result).toEqual({ user: mockUser });
        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          command.userId,
        );
      });
    });

    describe('when a non-existent user ID', () => {
      it('returns null user in response object', async () => {
        mockUserService.getUserById.mockResolvedValue(null);

        const command: GetUserByIdCommand = {
          userId: createUserId('non-existent'),
        };

        const result = await getUserByIdUseCase.execute(command);

        expect(result).toEqual({ user: null });
        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          command.userId,
        );
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
