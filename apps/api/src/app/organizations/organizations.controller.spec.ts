import { BadRequestException } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { createOrganizationId, IPullContentResponse } from '@packmind/types';
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
      getDeployedContent: jest.fn(),
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

  describe('pullAllContent', () => {
    const orgId = createOrganizationId('org-123');
    const mockRequest = {
      organization: { id: orgId },
      user: { userId: 'user-123' },
      clientSource: 'cli',
    } as AuthenticatedRequest;
    const mockResponse: IPullContentResponse = {
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
    };

    beforeEach(() => {
      mockDeploymentAdapter.pullAllContent.mockResolvedValue(mockResponse);
    });

    describe('when agent query param is provided', () => {
      describe('with a single valid agent', () => {
        it('passes agents to the adapter', async () => {
          await controller.pullAllContent(
            orgId,
            mockRequest,
            'backend',
            undefined,
            undefined,
            undefined,
            undefined,
            'claude',
          );

          expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude'],
            }),
          );
        });
      });

      describe('with multiple valid agents', () => {
        it('passes all agents to the adapter', async () => {
          await controller.pullAllContent(
            orgId,
            mockRequest,
            'backend',
            undefined,
            undefined,
            undefined,
            undefined,
            ['claude', 'cursor'],
          );

          expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude', 'cursor'],
            }),
          );
        });
      });

      describe('with invalid agent values', () => {
        it('filters out invalid agents', async () => {
          await controller.pullAllContent(
            orgId,
            mockRequest,
            'backend',
            undefined,
            undefined,
            undefined,
            undefined,
            ['claude', 'invalid-agent', 'cursor'],
          );

          expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude', 'cursor'],
            }),
          );
        });
      });

      describe('with only invalid agent values', () => {
        describe('when agentsConfigOverride is true', () => {
          it('passes empty agents array to the adapter', async () => {
            await controller.pullAllContent(
              orgId,
              mockRequest,
              'backend',
              undefined,
              undefined,
              undefined,
              undefined,
              ['invalid-agent', 'another-invalid'],
              'true',
            );

            expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
              expect.objectContaining({
                agents: [],
              }),
            );
          });
        });

        describe('when agentsConfigOverride is not provided', () => {
          it('does not pass agents to the adapter', async () => {
            await controller.pullAllContent(
              orgId,
              mockRequest,
              'backend',
              undefined,
              undefined,
              undefined,
              undefined,
              ['invalid-agent', 'another-invalid'],
              undefined,
            );

            expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
              expect.objectContaining({
                agents: undefined,
              }),
            );
          });
        });
      });
    });

    describe('when agentsConfigOverride is true but no agents provided', () => {
      it('passes empty agents array to the adapter', async () => {
        await controller.pullAllContent(
          orgId,
          mockRequest,
          'backend',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'true',
        );

        expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: [],
          }),
        );
      });
    });

    describe('when agent query param is not provided', () => {
      it('does not pass agents to the adapter', async () => {
        await controller.pullAllContent(
          orgId,
          mockRequest,
          'backend',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        );

        expect(mockDeploymentAdapter.pullAllContent).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: undefined,
          }),
        );
      });
    });
  });

  describe('getDeployedContent', () => {
    const orgId = createOrganizationId('org-123');
    const mockRequest = {
      organization: { id: orgId },
      user: { userId: 'user-123' },
      clientSource: 'cli',
    } as AuthenticatedRequest;
    const mockResponse: IPullContentResponse = {
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
    };

    const defaultBody = {
      packagesSlugs: ['backend'],
      gitRemoteUrl: 'https://github.com/org/repo.git',
      gitBranch: 'main',
      relativePath: '/',
    };

    beforeEach(() => {
      mockDeploymentAdapter.getDeployedContent.mockResolvedValue(mockResponse);
    });

    describe('when all required params are provided', () => {
      it('calls the adapter with correct params', async () => {
        await controller.getDeployedContent(orgId, mockRequest, {
          ...defaultBody,
          agents: ['claude'],
        });

        expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId: orgId,
          packagesSlugs: ['backend'],
          gitRemoteUrl: 'https://github.com/org/repo.git',
          gitBranch: 'main',
          relativePath: '/',
          agents: ['claude'],
          source: 'cli',
        });
      });

      it('returns the adapter response', async () => {
        const result = await controller.getDeployedContent(
          orgId,
          mockRequest,
          defaultBody,
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('when gitRemoteUrl is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.getDeployedContent(orgId, mockRequest, {
            packagesSlugs: ['backend'],
            gitBranch: 'main',
            relativePath: '/',
          } as typeof defaultBody),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when gitBranch is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.getDeployedContent(orgId, mockRequest, {
            packagesSlugs: ['backend'],
            gitRemoteUrl: 'https://github.com/org/repo.git',
            relativePath: '/',
          } as typeof defaultBody),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when relativePath is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.getDeployedContent(orgId, mockRequest, {
            packagesSlugs: ['backend'],
            gitRemoteUrl: 'https://github.com/org/repo.git',
            gitBranch: 'main',
          } as typeof defaultBody),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when agents is provided in body', () => {
      describe('with valid agents', () => {
        it('passes agents to the adapter', async () => {
          await controller.getDeployedContent(orgId, mockRequest, {
            ...defaultBody,
            agents: ['claude'],
          });

          expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude'],
            }),
          );
        });
      });

      describe('with multiple valid agents', () => {
        it('passes all agents to the adapter', async () => {
          await controller.getDeployedContent(orgId, mockRequest, {
            ...defaultBody,
            agents: ['claude', 'cursor'],
          });

          expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude', 'cursor'],
            }),
          );
        });
      });

      describe('with invalid agent values', () => {
        it('filters out invalid agents', async () => {
          await controller.getDeployedContent(orgId, mockRequest, {
            ...defaultBody,
            agents: ['claude', 'invalid-agent', 'cursor'],
          });

          expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude', 'cursor'],
            }),
          );
        });
      });

      describe('with only invalid agent values', () => {
        it('passes empty agents array to the adapter', async () => {
          await controller.getDeployedContent(orgId, mockRequest, {
            ...defaultBody,
            agents: ['invalid-agent', 'another-invalid'],
          });

          expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: [],
            }),
          );
        });
      });

      describe('with empty agents array', () => {
        it('passes empty agents array to the adapter', async () => {
          await controller.getDeployedContent(orgId, mockRequest, {
            ...defaultBody,
            agents: [],
          });

          expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: [],
            }),
          );
        });
      });
    });

    describe('when agents is not provided in body', () => {
      it('does not pass agents to the adapter', async () => {
        await controller.getDeployedContent(orgId, mockRequest, defaultBody);

        expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: undefined,
          }),
        );
      });
    });

    describe('when packagesSlugs has multiple values', () => {
      it('passes all slugs to the adapter', async () => {
        await controller.getDeployedContent(orgId, mockRequest, {
          ...defaultBody,
          packagesSlugs: ['backend', 'frontend'],
        });

        expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
          expect.objectContaining({
            packagesSlugs: ['backend', 'frontend'],
          }),
        );
      });
    });

    describe('when packagesSlugs is not provided', () => {
      it('passes empty array to the adapter', async () => {
        await controller.getDeployedContent(orgId, mockRequest, {
          gitRemoteUrl: 'https://github.com/org/repo.git',
          gitBranch: 'main',
          relativePath: '/',
        });

        expect(mockDeploymentAdapter.getDeployedContent).toHaveBeenCalledWith(
          expect.objectContaining({
            packagesSlugs: [],
          }),
        );
      });
    });
  });
});
