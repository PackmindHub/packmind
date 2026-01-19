import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createTrialActivationToken,
  createTrialActivationTokenId,
  createUserId,
  Organization,
  TrialActivation,
  User,
  AnonymousTrialAccountActivatedEvent,
} from '@packmind/types';
import { ActivateTrialAccountUseCase } from './ActivateTrialAccountUseCase';
import { TrialActivationService } from '../../services/TrialActivationService';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { InvalidTrialActivationTokenError } from '../../../domain/errors';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';

describe('ActivateTrialAccountUseCase', () => {
  let useCase: ActivateTrialAccountUseCase;
  let mockTrialActivationService: jest.Mocked<TrialActivationService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const mockUserId = createUserId('user-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockToken = createTrialActivationToken('test-token');
  const mockTrialActivationId = createTrialActivationTokenId('ta-123');

  const mockUser: User = {
    id: mockUserId,
    email: 'trial-123@packmind.trial',
    passwordHash: 'old-hash',
    active: true,
    trial: true,
    memberships: [
      {
        userId: mockUserId,
        organizationId: mockOrganizationId,
        role: 'admin',
      },
    ],
  };

  const mockOrganization: Organization = {
    id: mockOrganizationId,
    name: 'trial-org',
    slug: 'trial-org',
  };

  const mockTrialActivation: TrialActivation = {
    id: mockTrialActivationId,
    userId: mockUserId,
    token: mockToken,
    expirationDate: new Date(Date.now() + 60000),
  };

  beforeEach(() => {
    mockTrialActivationService = {
      findByToken: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TrialActivationService>;

    mockUserService = {
      getUserById: jest.fn(),
      hashPassword: jest.fn(),
      updateUser: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockOrganizationService = {
      getOrganizationById: jest.fn(),
      updateOrganization: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    mockEventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    useCase = new ActivateTrialAccountUseCase(
      mockTrialActivationService,
      mockUserService,
      mockOrganizationService,
      mockEventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when token is not found', () => {
    beforeEach(() => {
      mockTrialActivationService.findByToken.mockResolvedValue(null);
    });

    it('throws InvalidTrialActivationTokenError', async () => {
      await expect(
        useCase.execute({
          activationToken: mockToken,
          email: 'new@example.com',
          password: 'new-password',
          organizationName: 'New Org',
        }),
      ).rejects.toThrow(InvalidTrialActivationTokenError);
    });
  });

  describe('when token has expired', () => {
    beforeEach(() => {
      const expiredTrialActivation = {
        ...mockTrialActivation,
        expirationDate: new Date(Date.now() - 60000),
      };
      mockTrialActivationService.findByToken.mockResolvedValue(
        expiredTrialActivation,
      );
    });

    it('throws InvalidTrialActivationTokenError', async () => {
      await expect(
        useCase.execute({
          activationToken: mockToken,
          email: 'new@example.com',
          password: 'new-password',
          organizationName: 'New Org',
        }),
      ).rejects.toThrow(InvalidTrialActivationTokenError);
    });
  });

  describe('when user is not found', () => {
    beforeEach(() => {
      mockTrialActivationService.findByToken.mockResolvedValue(
        mockTrialActivation,
      );
      mockUserService.getUserById.mockResolvedValue(null);
    });

    it('throws User not found error', async () => {
      await expect(
        useCase.execute({
          activationToken: mockToken,
          email: 'new@example.com',
          password: 'new-password',
          organizationName: 'New Org',
        }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('when user has no organization membership', () => {
    beforeEach(() => {
      mockTrialActivationService.findByToken.mockResolvedValue(
        mockTrialActivation,
      );
      mockUserService.getUserById.mockResolvedValue({
        ...mockUser,
        memberships: [],
      });
    });

    it('throws User has no organization error', async () => {
      await expect(
        useCase.execute({
          activationToken: mockToken,
          email: 'new@example.com',
          password: 'new-password',
          organizationName: 'New Org',
        }),
      ).rejects.toThrow('User has no organization');
    });
  });

  describe('when activation is successful', () => {
    const newEmail = 'new@example.com';
    const newPassword = 'new-password';
    const newOrgName = 'New Org';
    const hashedPassword = 'hashed-new-password';

    beforeEach(() => {
      mockTrialActivationService.findByToken.mockResolvedValue(
        mockTrialActivation,
      );
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.hashPassword.mockResolvedValue(hashedPassword);
      mockUserService.updateUser.mockImplementation(async (user) => user);
      mockOrganizationService.getOrganizationById.mockResolvedValue(
        mockOrganization,
      );
      mockOrganizationService.updateOrganization.mockImplementation(
        async (org) => org,
      );
      mockTrialActivationService.delete.mockResolvedValue(undefined);
    });

    it('updates user email and password', async () => {
      await useCase.execute({
        activationToken: mockToken,
        email: newEmail,
        password: newPassword,
        organizationName: newOrgName,
      });

      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUserId,
          email: newEmail,
          passwordHash: hashedPassword,
          trial: false,
        }),
      );
    });

    it('updates organization name and slug', async () => {
      await useCase.execute({
        activationToken: mockToken,
        email: newEmail,
        password: newPassword,
        organizationName: newOrgName,
      });

      expect(mockOrganizationService.updateOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockOrganizationId,
          name: newOrgName,
          slug: 'new-org',
        }),
      );
    });

    it('deletes the trial activation token', async () => {
      await useCase.execute({
        activationToken: mockToken,
        email: newEmail,
        password: newPassword,
        organizationName: newOrgName,
      });

      expect(mockTrialActivationService.delete).toHaveBeenCalledWith(
        mockTrialActivation,
      );
    });

    it('returns updated user and organization', async () => {
      const result = await useCase.execute({
        activationToken: mockToken,
        email: newEmail,
        password: newPassword,
        organizationName: newOrgName,
      });

      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUserId,
          email: newEmail,
          trial: false,
        }),
        organization: expect.objectContaining({
          id: mockOrganizationId,
          name: newOrgName,
        }),
      });
    });

    it('emits event with correct payload', async () => {
      await useCase.execute({
        activationToken: mockToken,
        email: newEmail,
        password: newPassword,
        organizationName: newOrgName,
      });

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            userId: mockUserId,
            organizationId: mockOrganizationId,
            email: newEmail,
          }),
        }),
      );
    });

    it('emits AnonymousTrialAccountActivatedEvent instance', async () => {
      await useCase.execute({
        activationToken: mockToken,
        email: newEmail,
        password: newPassword,
        organizationName: newOrgName,
      });

      const trialActivatedCall = (
        mockEventEmitterService.emit as jest.Mock
      ).mock.calls.find(
        (call) => call[0] instanceof AnonymousTrialAccountActivatedEvent,
      );
      expect(trialActivatedCall[0]).toBeInstanceOf(
        AnonymousTrialAccountActivatedEvent,
      );
    });
  });
});
