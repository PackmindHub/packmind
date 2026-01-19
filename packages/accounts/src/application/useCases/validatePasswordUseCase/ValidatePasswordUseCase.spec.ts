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
      beforeEach(() => {
        mockUserService.validatePassword.mockResolvedValue(true);
      });

      it('returns isValid true', async () => {
        const result = await validatePasswordUseCase.execute(validCommand);

        expect(result).toEqual({ isValid: true });
      });

      it('calls validatePassword with correct parameters', async () => {
        await validatePasswordUseCase.execute(validCommand);

        expect(mockUserService.validatePassword).toHaveBeenCalledWith(
          'myPassword123',
          '$2b$10$abcdefghijklmnopqrstuvwxyz',
        );
      });
    });

    describe('with invalid credentials', () => {
      beforeEach(() => {
        mockUserService.validatePassword.mockResolvedValue(false);
      });

      it('returns isValid false', async () => {
        const result = await validatePasswordUseCase.execute(validCommand);

        expect(result).toEqual({ isValid: false });
      });

      it('calls validatePassword with correct parameters', async () => {
        await validatePasswordUseCase.execute(validCommand);

        expect(mockUserService.validatePassword).toHaveBeenCalledWith(
          'myPassword123',
          '$2b$10$abcdefghijklmnopqrstuvwxyz',
        );
      });
    });

    describe('with missing password', () => {
      const invalidCommand = {
        password: '',
        hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      };

      it('throws validation error', async () => {
        await expect(
          validatePasswordUseCase.execute(invalidCommand),
        ).rejects.toThrow('Password and hash are required for validation');
      });

      it('does not call validatePassword', async () => {
        try {
          await validatePasswordUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.validatePassword).not.toHaveBeenCalled();
      });
    });

    describe('with missing hash', () => {
      const invalidCommand = {
        password: 'myPassword123',
        hash: '',
      };

      it('throws validation error', async () => {
        await expect(
          validatePasswordUseCase.execute(invalidCommand),
        ).rejects.toThrow('Password and hash are required for validation');
      });

      it('does not call validatePassword', async () => {
        try {
          await validatePasswordUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.validatePassword).not.toHaveBeenCalled();
      });
    });

    describe('with missing password and hash', () => {
      const invalidCommand = {
        password: '',
        hash: '',
      };

      it('throws validation error', async () => {
        await expect(
          validatePasswordUseCase.execute(invalidCommand),
        ).rejects.toThrow('Password and hash are required for validation');
      });

      it('does not call validatePassword', async () => {
        try {
          await validatePasswordUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.validatePassword).not.toHaveBeenCalled();
      });
    });

    describe('with service error', () => {
      const serviceError = new Error('Password validation failed');

      beforeEach(() => {
        mockUserService.validatePassword.mockRejectedValue(serviceError);
      });

      it('rethrows error', async () => {
        await expect(
          validatePasswordUseCase.execute(validCommand),
        ).rejects.toThrow('Password validation failed');
      });

      it('calls validatePassword with correct parameters', async () => {
        try {
          await validatePasswordUseCase.execute(validCommand);
        } catch {
          // Expected to throw
        }

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
      const minimalCommand = {
        password: 'a',
        hash: 'b',
      };

      beforeEach(() => {
        mockUserService.validatePassword.mockResolvedValue(true);
      });

      it('validates password successfully', async () => {
        const result = await validatePasswordUseCase.execute(minimalCommand);

        expect(result).toEqual({ isValid: true });
      });

      it('calls validatePassword with minimal parameters', async () => {
        await validatePasswordUseCase.execute(minimalCommand);

        expect(mockUserService.validatePassword).toHaveBeenCalledWith('a', 'b');
      });
    });
  });
});
