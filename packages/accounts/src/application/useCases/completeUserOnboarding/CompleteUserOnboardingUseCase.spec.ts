import { PackmindLogger } from '@packmind/logger';
import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CompleteUserOnboardingCommand,
  IAccountsPort,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { UserMetadataService } from '../../services/UserMetadataService';
import { CompleteUserOnboardingUseCase } from './CompleteUserOnboardingUseCase';

describe('CompleteUserOnboardingUseCase', () => {
  let useCase: CompleteUserOnboardingUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockUserMetadataService: jest.Mocked<UserMetadataService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-456');

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockUserMetadataService = {
      markOnboardingCompleted: jest.fn(),
    } as unknown as jest.Mocked<UserMetadataService>;

    stubbedLogger = stubLogger();

    useCase = new CompleteUserOnboardingUseCase(
      mockAccountsPort,
      mockUserMetadataService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    it('marks onboarding as completed and returns success', async () => {
      const user = userFactory({ id: userId });
      const organization = organizationFactory({ id: organizationId });
      const membership = {
        userId,
        organizationId,
        role: 'member' as const,
      };

      const command: CompleteUserOnboardingCommand & MemberContext = {
        userId: String(userId),
        organizationId,
        user,
        organization,
        membership,
      };

      mockUserMetadataService.markOnboardingCompleted.mockResolvedValue({
        id: 'metadata-1' as never,
        userId,
        onboardingCompleted: true,
      });

      const result = await useCase.executeForMembers(command);

      expect(mockUserMetadataService.markOnboardingCompleted).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ success: true });
    });
  });
});
