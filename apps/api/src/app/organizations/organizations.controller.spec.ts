import { OrganizationsController } from './organizations.controller';
import { createOrganizationId, AccountsHexa } from '@packmind/accounts';
import { stubLogger } from '@packmind/test-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { DeploymentsHexa } from '@packmind/deployments';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let mockAccountsHexa: jest.Mocked<AccountsHexa>;
  let mockDeploymentsHexa: jest.Mocked<DeploymentsHexa>;

  beforeEach(() => {
    const logger = stubLogger();
    mockAccountsHexa = {
      getOrganizationOnboardingStatus: jest.fn(),
    } as unknown as jest.Mocked<AccountsHexa>;

    mockDeploymentsHexa = {
      getDeploymentsUseCases: jest.fn().mockReturnValue({
        pullAllContent: jest.fn(),
      }),
    } as unknown as jest.Mocked<DeploymentsHexa>;

    controller = new OrganizationsController(
      mockAccountsHexa,
      mockDeploymentsHexa,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationInfo', () => {
    it('returns organization info with correct structure', async () => {
      const orgId = createOrganizationId('org-123');

      const result = await controller.getOrganizationInfo(orgId);

      expect(result).toEqual({
        message: 'Organization routing active',
        organizationId: orgId,
      });
    });

    it('handles different organization IDs', async () => {
      const orgId = createOrganizationId('org-456');

      const result = await controller.getOrganizationInfo(orgId);

      expect(result.organizationId).toBe(orgId);
    });
  });

  describe('getOnboardingStatus', () => {
    it('returns onboarding status from accounts hexa', async () => {
      const orgId = createOrganizationId('org-123');
      const mockRequest = {
        organization: { id: orgId },
        user: { userId: 'user-123' },
      } as AuthenticatedRequest;

      const mockStatus = {
        hasConnectedGitProvider: true,
        hasConnectedGitRepo: true,
        hasCreatedStandard: false,
        hasDeployed: false,
        hasInvitedColleague: true,
      };

      mockAccountsHexa.getOrganizationOnboardingStatus.mockResolvedValue(
        mockStatus,
      );

      const result = await controller.getOnboardingStatus(orgId, mockRequest);

      expect(result).toEqual(mockStatus);
      expect(
        mockAccountsHexa.getOrganizationOnboardingStatus,
      ).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: orgId,
      });
    });
  });
});
