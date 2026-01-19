import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  User,
  UserJoinedOrganizationEvent,
} from '@packmind/types';
import {
  createInvitationId,
  createInvitationToken,
  Invitation,
} from '../../../domain/entities/Invitation';
import {
  InvitationExpiredError,
  InvitationNotFoundError,
  UserNotFoundError,
} from '../../../domain/errors';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';
import { ActivateUserAccountUseCase } from './ActivateUserAccountUseCase';

describe('ActivateUserAccountUseCase', () => {
  let useCase: ActivateUserAccountUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockInvitationService: jest.Mocked<InvitationService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
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

    mockEventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockLogger = stubLogger();

    useCase = new ActivateUserAccountUseCase(
      mockUserService,
      mockInvitationService,
      mockEventEmitterService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when activation is successful', () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };
      const hashedPassword = 'hashed-password';
      let updatedUser: User;
      let result: {
        success: boolean;
        user: { id: string; email: string; isActive: boolean };
      };

      beforeEach(async () => {
        updatedUser = {
          ...mockUser,
          passwordHash: hashedPassword,
          active: true,
        };

        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(mockUser);
        mockUserService.hashPassword.mockResolvedValue(hashedPassword);
        mockUserService.updateUser.mockResolvedValue(updatedUser);

        result = await useCase.execute(command);
      });

      it('returns success with user data', () => {
        expect(result).toEqual({
          success: true,
          user: {
            id: mockUserId as string,
            email: 'test@example.com',
            isActive: true,
          },
        });
      });

      it('finds invitation by token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });

      it('retrieves user by id', () => {
        expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUserId);
      });

      it('hashes the password', () => {
        expect(mockUserService.hashPassword).toHaveBeenCalledWith(
          'newPassword123!',
        );
      });

      it('updates the user', () => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith(updatedUser);
      });

      it('deletes the invitation', () => {
        expect(mockInvitationService.delete).toHaveBeenCalledWith(
          mockInvitationId,
        );
      });

      it('emits UserJoinedOrganizationEvent', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(UserJoinedOrganizationEvent),
        );
      });

      it('emits event with correct payload', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: {
              userId: mockUserId,
              organizationId: mockOrganizationId,
              email: 'test@example.com',
              source: 'ui',
            },
          }),
        );
      });
    });

    describe('when invitation does not exist', () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };

      beforeEach(async () => {
        mockInvitationService.findByToken.mockResolvedValue(null);
        await useCase.execute(command).catch(() => {
          // Expected to throw - catch to set up state for assertions
        });
      });

      it('throws InvitationNotFoundError', async () => {
        mockInvitationService.findByToken.mockResolvedValue(null);
        await expect(useCase.execute(command)).rejects.toThrow(
          InvitationNotFoundError,
        );
      });

      it('does not call getUserById', () => {
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });

      it('does not emit UserJoinedOrganizationEvent', () => {
        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('when invitation is expired', () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };
      const expiredInvitation = {
        ...mockInvitation,
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };

      beforeEach(async () => {
        mockInvitationService.findByToken.mockResolvedValue(expiredInvitation);
        await useCase.execute(command).catch(() => {
          // Expected to throw - catch to set up state for assertions
        });
      });

      it('throws InvitationExpiredError', async () => {
        mockInvitationService.findByToken.mockResolvedValue(expiredInvitation);
        await expect(useCase.execute(command)).rejects.toThrow(
          InvitationExpiredError,
        );
      });

      it('does not call getUserById', () => {
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });
    });

    describe('when user does not exist', () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };

      beforeEach(async () => {
        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(null);
        await useCase.execute(command).catch(() => {
          // Expected to throw - catch to set up state for assertions
        });
      });

      it('throws UserNotFoundError', async () => {
        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(null);
        await expect(useCase.execute(command)).rejects.toThrow(
          UserNotFoundError,
        );
      });

      it('does not hash password', () => {
        expect(mockUserService.hashPassword).not.toHaveBeenCalled();
      });

      it('does not update user', () => {
        expect(mockUserService.updateUser).not.toHaveBeenCalled();
      });
    });

    describe('when user is already active', () => {
      const command = {
        token: mockToken as string,
        password: 'newPassword123!',
      };
      const activeUser = {
        ...mockUser,
        active: true,
        passwordHash: 'existing-hash',
      };
      let result: {
        success: boolean;
        user: { id: string; email: string; isActive: boolean };
      };

      beforeEach(async () => {
        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(activeUser);

        result = await useCase.execute(command);
      });

      it('returns success with user data', () => {
        expect(result).toEqual({
          success: true,
          user: {
            id: mockUserId as string,
            email: 'test@example.com',
            isActive: true,
          },
        });
      });

      it('does not hash password', () => {
        expect(mockUserService.hashPassword).not.toHaveBeenCalled();
      });

      it('does not update user', () => {
        expect(mockUserService.updateUser).not.toHaveBeenCalled();
      });

      it('does not delete invitation', () => {
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
