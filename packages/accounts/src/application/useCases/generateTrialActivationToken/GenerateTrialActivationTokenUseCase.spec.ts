import { stubLogger } from '@packmind/test-utils';
import {
  createUserId,
  createOrganizationId,
  createTrialActivationToken,
  createTrialActivationTokenId,
  GenerateTrialActivationTokenCommand,
  IAccountsPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GenerateTrialActivationTokenUseCase } from './GenerateTrialActivationTokenUseCase';
import { TrialActivationService } from '../../services/TrialActivationService';
import { userFactory, organizationFactory } from '../../../../test';

describe('GenerateTrialActivationTokenUseCase', () => {
  let useCase: GenerateTrialActivationTokenUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockTrialActivationService: jest.Mocked<TrialActivationService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const mockUserId = createUserId('user-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockOrganization = organizationFactory({ id: mockOrganizationId });
  const mockUser = userFactory({
    id: mockUserId,
    email: 'test@example.com',
    memberships: [
      {
        userId: mockUserId,
        organizationId: mockOrganizationId,
        role: 'member',
      },
    ],
  });

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockTrialActivationService = {
      generateTrialActivationToken: jest.fn(),
      findByToken: jest.fn(),
      findLatestByUserId: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TrialActivationService>;

    stubbedLogger = stubLogger();

    useCase = new GenerateTrialActivationTokenUseCase(
      mockAccountsPort,
      mockTrialActivationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when user is a member of the organization', () => {
      const mockTrialActivation = {
        id: createTrialActivationTokenId('ta-123'),
        userId: mockUserId,
        token: createTrialActivationToken('signed-token'),
        expirationDate: new Date(),
      };

      beforeEach(() => {
        mockAccountsPort.getUserById.mockResolvedValue(mockUser);
        mockAccountsPort.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );
        mockTrialActivationService.generateTrialActivationToken.mockResolvedValue(
          mockTrialActivation,
        );
      });

      it('validates user membership via AbstractMemberUseCase', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        await useCase.execute(command);

        expect(mockAccountsPort.getUserById).toHaveBeenCalledWith(mockUserId);
      });

      it('generates a trial activation token', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        await useCase.execute(command);

        expect(
          mockTrialActivationService.generateTrialActivationToken,
        ).toHaveBeenCalledWith(mockUserId);
      });

      it('returns the activation token', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        const result = await useCase.execute(command);

        expect(result.activationToken).toBe(mockTrialActivation.token);
      });
    });

    describe('when user does not exist', () => {
      beforeEach(() => {
        mockAccountsPort.getUserById.mockResolvedValue(null);
      });

      it('throws UserNotFoundError', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        await expect(useCase.execute(command)).rejects.toThrow();
      });

      it('does not generate trial activation token', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          mockTrialActivationService.generateTrialActivationToken,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when user is not a member of the organization', () => {
      beforeEach(() => {
        const userWithoutMembership = userFactory({
          id: mockUserId,
          email: 'test@example.com',
          memberships: [],
        });
        mockAccountsPort.getUserById.mockResolvedValue(userWithoutMembership);
      });

      it('throws UserNotInOrganizationError', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        await expect(useCase.execute(command)).rejects.toThrow();
      });

      it('does not generate trial activation token', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          mockTrialActivationService.generateTrialActivationToken,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when service fails', () => {
      beforeEach(() => {
        mockAccountsPort.getUserById.mockResolvedValue(mockUser);
        mockAccountsPort.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );
        mockTrialActivationService.generateTrialActivationToken.mockRejectedValue(
          new Error('Service error'),
        );
      });

      it('throws the error', async () => {
        const command: GenerateTrialActivationTokenCommand = {
          userId: mockUserId,
          organizationId: mockOrganizationId,
        };

        await expect(useCase.execute(command)).rejects.toThrow('Service error');
      });
    });
  });
});
