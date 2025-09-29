import { CheckEmailAvailabilityUseCase } from './CheckEmailAvailabilityUseCase';
import { UserService } from '../../services/UserService';
import { userFactory } from '../../../../test';
import { createUserId } from '../../../domain/entities/User';
import { CheckEmailAvailabilityCommand } from '@packmind/shared';

describe('CheckEmailAvailabilityUseCase', () => {
  let checkEmailAvailabilityUseCase: CheckEmailAvailabilityUseCase;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockUserService = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      getUserByEmailCaseInsensitive: jest.fn(),
      hashPassword: jest.fn(),
      validatePassword: jest.fn(),
      listUsers: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    checkEmailAvailabilityUseCase = new CheckEmailAvailabilityUseCase(
      mockUserService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when email is available', () => {
      it('returns available true', async () => {
        const command: CheckEmailAvailabilityCommand = {
          email: 'available@packmind.com',
        };

        mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(null);

        const result = await checkEmailAvailabilityUseCase.execute(command);

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('available@packmind.com');
        expect(result).toEqual({ available: true });
      });
    });

    describe('when email is already taken', () => {
      it('returns available false', async () => {
        const command: CheckEmailAvailabilityCommand = {
          email: 'taken@packmind.com',
        };

        const existingUser = userFactory({
          id: createUserId('user-123'),
          email: 'taken@packmind.com',
        });

        mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );

        const result = await checkEmailAvailabilityUseCase.execute(command);

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('taken@packmind.com');
        expect(result).toEqual({ available: false });
      });
    });

    describe('when email case differs', () => {
      it('returns available false for case-insensitive match', async () => {
        const command: CheckEmailAvailabilityCommand = {
          email: 'NewUser@Packmind.com',
        };

        const existingUser = userFactory({
          id: createUserId('user-123'),
          email: 'newuser@packmind.com', // Different case
        });

        mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );

        const result = await checkEmailAvailabilityUseCase.execute(command);

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('NewUser@Packmind.com');
        expect(result).toEqual({ available: false });
      });
    });

    describe('when service throws error', () => {
      it('propagates the error', async () => {
        const command: CheckEmailAvailabilityCommand = {
          email: 'error@packmind.com',
        };

        const serviceError = new Error('Database connection failed');
        mockUserService.getUserByEmailCaseInsensitive.mockRejectedValue(
          serviceError,
        );

        await expect(
          checkEmailAvailabilityUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('error@packmind.com');
      });
    });
  });
});
