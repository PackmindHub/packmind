import { ActivateUserAccountUseCase } from './ActivateUserAccountUseCase';
import { UserService } from '../../services/UserService';
import { InvitationService } from '../../services/InvitationService';
import { PackmindLogger } from '@packmind/logger';
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  UserNotFoundError,
} from '../../../domain/errors';
import {
  createInvitationId,
  createInvitationToken,
  Invitation,
} from '../../../domain/entities/Invitation';
import { createUserId, User } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

describe('ActivateUserAccountUseCase', () => {
  let useCase: ActivateUserAccountUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockInvitationService: jest.Mocked<InvitationService>;

  let mockLogger: jest.Mocked<PackmindLogger>;

  const mockUserId = createUserId('user-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockInvitationId = createInvitationId('invitation-123');
  const mockToken = createInvitationToken('valid-token-123');

  const mockUser: User = {
    id: mockUserId,
    email: 'test@example.com',
    passwordHash: null,
    active: false,
    memberships: [
      {
        userId: mockUserId,
        organizationId: mockOrganizationId,
        role: 'member',
      },
    ],
  };

  const mockInvitation: Invitation = {
    id: mockInvitationId,
    userId: mockUserId,
    token: mockToken,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  };

  beforeEach(() => {
    mockUserService = {
      getUserById: jest.fn(),
      hashPassword: jest.fn(),
      updateUser: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockInvitationService = {
      findByToken: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<InvitationService>;

    mockLogger = stubLogger();

    useCase = new ActivateUserAccountUseCase(
      mockUserService,
      mockInvitationService,
      mockLogger,
    );
  });

  describe('execute', () => {
    it('successfully activate a user account', async () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };

      const hashedPassword = 'hashed-password';
      const updatedUser = {
        ...mockUser,
        passwordHash: hashedPassword,
        active: true,
      };

      mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.hashPassword.mockResolvedValue(hashedPassword);
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        success: true,
        user: {
          id: mockUserId as string,
          email: 'test@example.com',
          isActive: true,
        },
      });

      expect(mockInvitationService.findByToken).toHaveBeenCalledWith(mockToken);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUserId);
      expect(mockUserService.hashPassword).toHaveBeenCalledWith(
        'newPassword123!',
      );
      expect(mockUserService.updateUser).toHaveBeenCalledWith(updatedUser);
      expect(mockInvitationService.delete).toHaveBeenCalledWith(
        mockInvitationId,
      );
    });

    describe('when invitation does not exist', () => {
      it('throws InvitationNotFoundError', async () => {
        const command = {
          token: mockToken as string,
          password: 'newPassword123!',
        };

        mockInvitationService.findByToken.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          InvitationNotFoundError,
        );
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });
    });

    describe('when invitation is expired', () => {
      it('throws InvitationExpiredError', async () => {
        const command = {
          token: mockToken as string,
          password: 'newPassword123!',
        };

        const expiredInvitation = {
          ...mockInvitation,
          expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };

        mockInvitationService.findByToken.mockResolvedValue(expiredInvitation);

        await expect(useCase.execute(command)).rejects.toThrow(
          InvitationExpiredError,
        );
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });
    });

    describe('when user does not exist', () => {
      it('throws UserNotFoundError', async () => {
        const command = {
          token: mockToken as string,
          password: 'newPassword123!',
        };

        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          UserNotFoundError,
        );
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
        expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUserId);
      });
    });

    describe('when user is already active', () => {
      it('returns success without updating user', async () => {
        const command = {
          token: mockToken as string,
          password: 'newPassword123!',
        };

        const activeUser = {
          ...mockUser,
          active: true,
          passwordHash: 'existing-hash',
        };

        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(activeUser);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          success: true,
          user: {
            id: mockUserId as string,
            email: 'test@example.com',
            isActive: true,
          },
        });

        expect(mockUserService.hashPassword).not.toHaveBeenCalled();
        expect(mockUserService.updateUser).not.toHaveBeenCalled();
        expect(mockInvitationService.delete).not.toHaveBeenCalled();
      });
    });

    it('handles errors and logs them appropriately', async () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };

      const error = new Error('Database connection failed');
      mockInvitationService.findByToken.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toThrow(error);
    });
  });
});
