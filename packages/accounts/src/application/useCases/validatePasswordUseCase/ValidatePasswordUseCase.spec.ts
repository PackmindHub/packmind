import { ValidatePasswordUseCase } from './ValidatePasswordUseCase';
import { UserService } from '../../services/UserService';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';

describe('ValidatePasswordUseCase', () => {
  let validatePasswordUseCase: ValidatePasswordUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockUserService = {
      validatePassword: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    stubbedLogger = stubLogger();

    validatePasswordUseCase = new ValidatePasswordUseCase(
      mockUserService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validCommand = {
      password: 'myPassword123',
      hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    };

    describe('with valid credentials', () => {
      it('returns isValid true', async () => {
        mockUserService.validatePassword.mockResolvedValue(true);

        const result = await validatePasswordUseCase.execute(validCommand);

        expect(result).toEqual({ isValid: true });
        expect(mockUserService.validatePassword).toHaveBeenCalledWith(
          'myPassword123',
          '$2b$10$abcdefghijklmnopqrstuvwxyz',
        );
      });
    });

    describe('with invalid credentials', () => {
      it('returns isValid false', async () => {
        mockUserService.validatePassword.mockResolvedValue(false);

        const result = await validatePasswordUseCase.execute(validCommand);

        expect(result).toEqual({ isValid: false });
        expect(mockUserService.validatePassword).toHaveBeenCalledWith(
          'myPassword123',
          '$2b$10$abcdefghijklmnopqrstuvwxyz',
        );
      });
    });

    describe('with missing password', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          password: '',
          hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        };

        await expect(
          validatePasswordUseCase.execute(invalidCommand),
        ).rejects.toThrow('Password and hash are required for validation');

        expect(mockUserService.validatePassword).not.toHaveBeenCalled();
      });
    });

    describe('with missing hash', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          password: 'myPassword123',
          hash: '',
        };

        await expect(
          validatePasswordUseCase.execute(invalidCommand),
        ).rejects.toThrow('Password and hash are required for validation');

        expect(mockUserService.validatePassword).not.toHaveBeenCalled();
      });
    });

    describe('with missing password and hash', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          password: '',
          hash: '',
        };

        await expect(
          validatePasswordUseCase.execute(invalidCommand),
        ).rejects.toThrow('Password and hash are required for validation');

        expect(mockUserService.validatePassword).not.toHaveBeenCalled();
      });
    });

    describe('with service error', () => {
      it('rethrows error', async () => {
        const serviceError = new Error('Password validation failed');
        mockUserService.validatePassword.mockRejectedValue(serviceError);

        await expect(
          validatePasswordUseCase.execute(validCommand),
        ).rejects.toThrow('Password validation failed');

        expect(mockUserService.validatePassword).toHaveBeenCalledWith(
          'myPassword123',
          '$2b$10$abcdefghijklmnopqrstuvwxyz',
        );
      });
    });

    describe('with non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Service unavailable';
        mockUserService.validatePassword.mockRejectedValue(serviceError);

        await expect(
          validatePasswordUseCase.execute(validCommand),
        ).rejects.toBe('Service unavailable');
      });
    });

    describe('with minimal valid input', () => {
      it('validates password successfully', async () => {
        const minimalCommand = {
          password: 'a',
          hash: 'b',
        };
        mockUserService.validatePassword.mockResolvedValue(true);

        const result = await validatePasswordUseCase.execute(minimalCommand);

        expect(result).toEqual({ isValid: true });
        expect(mockUserService.validatePassword).toHaveBeenCalledWith('a', 'b');
      });
    });
  });
});
