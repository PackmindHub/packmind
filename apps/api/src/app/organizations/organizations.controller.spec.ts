import { OrganizationsController } from './organizations.controller';
import { createOrganizationId } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { IAccountsPort, IDeploymentPort } from '@packmind/types';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;
  let mockDeploymentAdapter: jest.Mocked<IDeploymentPort>;

  beforeEach(() => {
    const logger = stubLogger();
    mockAccountsAdapter = {
      getOrganizationOnboardingStatus: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockDeploymentAdapter = {
      pullAllContent: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    controller = new OrganizationsController(
      mockAccountsAdapter,
      mockDeploymentAdapter,
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
    let result: typeof mockStatus;

    beforeEach(async () => {
      mockAccountsAdapter.getOrganizationOnboardingStatus.mockResolvedValue(
        mockStatus,
      );
      result = await controller.getOnboardingStatus(orgId, mockRequest);
    });

    it('returns onboarding status', () => {
      expect(result).toEqual(mockStatus);
    });

    it('calls adapter with correct params', () => {
      expect(
        mockAccountsAdapter.getOrganizationOnboardingStatus,
      ).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: orgId,
      });
    });
  });
});
