import { CheckEmailAvailabilityUseCase } from './CheckEmailAvailabilityUseCase';
import { UserService } from '../../services/UserService';
import { userFactory } from '../../../../test';
import { createUserId } from '@packmind/types';
import { CheckEmailAvailabilityCommand } from '@packmind/types';

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
      const command: CheckEmailAvailabilityCommand = {
        email: 'available@packmind.com',
      };

      beforeEach(() => {
        mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(null);
      });

      it('calls user service with the email', async () => {
        await checkEmailAvailabilityUseCase.execute(command);

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('available@packmind.com');
      });

      it('returns available true', async () => {
        const result = await checkEmailAvailabilityUseCase.execute(command);

        expect(result).toEqual({ available: true });
      });
    });

    describe('when email is already taken', () => {
      const command: CheckEmailAvailabilityCommand = {
        email: 'taken@packmind.com',
      };

      beforeEach(() => {
        const existingUser = userFactory({
          id: createUserId('user-123'),
          email: 'taken@packmind.com',
        });

        mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );
      });

      it('calls user service with the email', async () => {
        await checkEmailAvailabilityUseCase.execute(command);

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('taken@packmind.com');
      });

      it('returns available false', async () => {
        const result = await checkEmailAvailabilityUseCase.execute(command);

        expect(result).toEqual({ available: false });
      });
    });

    describe('when email case differs', () => {
      const command: CheckEmailAvailabilityCommand = {
        email: 'NewUser@Packmind.com',
      };

      beforeEach(() => {
        const existingUser = userFactory({
          id: createUserId('user-123'),
          email: 'newuser@packmind.com', // Different case
        });

        mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );
      });

      it('calls user service with the original email case', async () => {
        await checkEmailAvailabilityUseCase.execute(command);

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('NewUser@Packmind.com');
      });

      it('returns available false for case-insensitive match', async () => {
        const result = await checkEmailAvailabilityUseCase.execute(command);

        expect(result).toEqual({ available: false });
      });
    });

    describe('when service throws error', () => {
      const command: CheckEmailAvailabilityCommand = {
        email: 'error@packmind.com',
      };

      beforeEach(() => {
        const serviceError = new Error('Database connection failed');
        mockUserService.getUserByEmailCaseInsensitive.mockRejectedValue(
          serviceError,
        );
      });

      it('calls user service with the email', async () => {
        await checkEmailAvailabilityUseCase.execute(command).catch(() => {
          // Expected to throw - catch to verify side effects
        });

        expect(
          mockUserService.getUserByEmailCaseInsensitive,
        ).toHaveBeenCalledWith('error@packmind.com');
      });

      it('propagates the error', async () => {
        await expect(
          checkEmailAvailabilityUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');
      });
    });
  });
});
