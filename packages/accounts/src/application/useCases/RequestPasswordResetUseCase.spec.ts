import { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase';
import { UserService } from '../services/UserService';
import { PasswordResetTokenService } from '../services/PasswordResetTokenService';
import { stubLogger } from '@packmind/test-utils';
import { userFactory } from '../../../test/userFactory';

describe('RequestPasswordResetUseCase', () => {
  let useCase: RequestPasswordResetUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockPasswordResetTokenService: jest.Mocked<PasswordResetTokenService>;

  beforeEach(() => {
    mockUserService = {
      getUserByEmailCaseInsensitive: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockPasswordResetTokenService = {
      createPasswordResetToken: jest.fn(),
      sendSocialLoginReminderEmail: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetTokenService>;

    useCase = new RequestPasswordResetUseCase(
      mockUserService,
      mockPasswordResetTokenService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is social-only (passwordHash is null)', () => {
    let result: { success: boolean };

    beforeEach(async () => {
      const socialUser = userFactory({
        passwordHash: null,
        active: true,
      });
      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
        socialUser,
      );

      result = await useCase.execute({ email: socialUser.email });
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('does not create a password reset token', () => {
      expect(
        mockPasswordResetTokenService.createPasswordResetToken,
      ).not.toHaveBeenCalled();
    });

    it('sends social login reminder email', () => {
      expect(
        mockPasswordResetTokenService.sendSocialLoginReminderEmail,
      ).toHaveBeenCalled();
    });
  });
});
