import { ValidateInvitationTokenUseCase } from './ValidateInvitationTokenUseCase';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/logger';
import {
  createInvitationId,
  createInvitationToken,
  Invitation,
} from '../../../domain/entities/Invitation';
import { createUserId, User } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

describe('ValidateInvitationTokenUseCase', () => {
  let useCase: ValidateInvitationTokenUseCase;
  let mockInvitationService: jest.Mocked<InvitationService>;
  let mockUserService: jest.Mocked<UserService>;
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
    mockInvitationService = {
      findByToken: jest.fn(),
    } as unknown as jest.Mocked<InvitationService>;

    mockUserService = {
      getUserById: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockLogger = stubLogger();

    useCase = new ValidateInvitationTokenUseCase(
      mockInvitationService,
      mockUserService,
      mockLogger,
    );
  });

  describe('execute', () => {
    describe('when invitation token is valid', () => {
      let result: { email: string; isValid: boolean };

      beforeEach(async () => {
        const command = {
          token: mockToken as string,
        };

        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(mockUser);

        result = await useCase.execute(command);
      });

      it('returns valid result with email', () => {
        expect(result).toEqual({
          email: 'test@example.com',
          isValid: true,
        });
      });

      it('calls findByToken with correct token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });

      it('calls getUserById with correct userId', () => {
        expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUserId);
      });
    });

    describe('when invitation does not exist', () => {
      let result: { email: string; isValid: boolean };

      beforeEach(async () => {
        const command = {
          token: mockToken as string,
        };

        mockInvitationService.findByToken.mockResolvedValue(null);

        result = await useCase.execute(command);
      });

      it('returns invalid result', () => {
        expect(result).toEqual({
          email: '',
          isValid: false,
        });
      });

      it('calls findByToken with correct token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });

      it('does not call getUserById', () => {
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });
    });

    describe('when invitation is expired', () => {
      let result: { email: string; isValid: boolean };

      beforeEach(async () => {
        const command = {
          token: mockToken as string,
        };

        const expiredInvitation = {
          ...mockInvitation,
          expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        };

        mockInvitationService.findByToken.mockResolvedValue(expiredInvitation);

        result = await useCase.execute(command);
      });

      it('returns invalid result', () => {
        expect(result).toEqual({
          email: '',
          isValid: false,
        });
      });

      it('calls findByToken with correct token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });

      it('does not call getUserById', () => {
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });
    });

    describe('when user does not exist', () => {
      let result: { email: string; isValid: boolean };

      beforeEach(async () => {
        const command = {
          token: mockToken as string,
        };

        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(null);

        result = await useCase.execute(command);
      });

      it('returns invalid result', () => {
        expect(result).toEqual({
          email: '',
          isValid: false,
        });
      });

      it('calls findByToken with correct token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });

      it('calls getUserById with correct userId', () => {
        expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUserId);
      });
    });

    describe('when user is already active (invitation already used)', () => {
      let result: { email: string; isValid: boolean };

      beforeEach(async () => {
        const command = {
          token: mockToken as string,
        };

        const activeUser = {
          ...mockUser,
          active: true,
          passwordHash: 'existing-hash',
        };

        mockInvitationService.findByToken.mockResolvedValue(mockInvitation);
        mockUserService.getUserById.mockResolvedValue(activeUser);

        result = await useCase.execute(command);
      });

      it('returns invalid result', () => {
        expect(result).toEqual({
          email: '',
          isValid: false,
        });
      });

      it('calls findByToken with correct token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });

      it('calls getUserById with correct userId', () => {
        expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUserId);
      });
    });

    describe('when an error occurs', () => {
      let result: { email: string; isValid: boolean };

      beforeEach(async () => {
        const command = {
          token: mockToken as string,
        };

        const error = new Error('Database connection failed');
        mockInvitationService.findByToken.mockRejectedValue(error);

        result = await useCase.execute(command);
      });

      it('returns invalid result for security', () => {
        expect(result).toEqual({
          email: '',
          isValid: false,
        });
      });

      it('calls findByToken with correct token', () => {
        expect(mockInvitationService.findByToken).toHaveBeenCalledWith(
          mockToken,
        );
      });
    });

    describe('when token is malformed', () => {
      it('returns invalid result for security', async () => {
        const command = {
          token: 'malformed-token',
        };

        const error = new Error('Invalid token format');
        mockInvitationService.findByToken.mockRejectedValue(error);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          email: '',
          isValid: false,
        });
      });
    });
  });
});
