import { BadRequestException } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import {
  ArtifactVersionEntry,
  createOrganizationId,
  IPullContentResponse,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  IAccountsPort,
  IDeploymentPort,
  ISpacesPort,
  ListUserSpacesResponse,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;
  let mockDeploymentAdapter: jest.Mocked<IDeploymentPort>;
  let mockSpacesAdapter: jest.Mocked<ISpacesPort>;

  beforeEach(() => {
    const logger = stubLogger();
    mockAccountsAdapter = {
      getOrganizationOnboardingStatus: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockDeploymentAdapter = {
      pullAllContent: jest.fn(),
      getDeployedContent: jest.fn(),
      getContentByVersions: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    mockSpacesAdapter = {
      listUserSpaces: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    controller = new OrganizationsController(
      mockAccountsAdapter,
      mockDeploymentAdapter,
      mockSpacesAdapter,
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
      resolvedAgents: [],
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
      resolvedAgents: [],
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

  describe('getContentByVersions', () => {
    const orgId = createOrganizationId('org-123');
    const mockRequest = {
      organization: { id: orgId },
      user: { userId: 'user-123' },
      clientSource: 'cli',
    } as AuthenticatedRequest;
    const mockResponse: IPullContentResponse = {
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
      resolvedAgents: [],
    };

    const defaultArtifacts: ArtifactVersionEntry[] = [
      {
        name: 'test-standard',
        type: 'standard',
        id: 'std-1',
        version: 1,
        spaceId: 'space-1',
      },
      {
        name: 'test-recipe',
        type: 'command',
        id: 'rec-1',
        version: 2,
        spaceId: 'space-1',
      },
    ];

    beforeEach(() => {
      mockDeploymentAdapter.getContentByVersions.mockResolvedValue(
        mockResponse,
      );
    });

    describe('when all required params are provided', () => {
      it('calls the adapter with correct params', async () => {
        await controller.getContentByVersions(orgId, mockRequest, {
          artifacts: defaultArtifacts,
          agents: ['claude'],
        });

        expect(mockDeploymentAdapter.getContentByVersions).toHaveBeenCalledWith(
          {
            userId: 'user-123',
            organizationId: orgId,
            artifacts: defaultArtifacts,
            agents: ['claude'],
            source: 'cli',
          },
        );
      });

      it('returns the adapter response', async () => {
        const result = await controller.getContentByVersions(
          orgId,
          mockRequest,
          { artifacts: defaultArtifacts },
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('when artifacts is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.getContentByVersions(
            orgId,
            mockRequest,
            {} as {
              artifacts: ArtifactVersionEntry[];
            },
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when artifacts is not an array', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.getContentByVersions(orgId, mockRequest, {
            artifacts: 'not-an-array',
          } as unknown as { artifacts: ArtifactVersionEntry[] }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when agents is provided in body', () => {
      describe('with valid agents', () => {
        it('passes agents to the adapter', async () => {
          await controller.getContentByVersions(orgId, mockRequest, {
            artifacts: defaultArtifacts,
            agents: ['claude'],
          });

          expect(
            mockDeploymentAdapter.getContentByVersions,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude'],
            }),
          );
        });
      });

      describe('with invalid agent values', () => {
        it('filters out invalid agents', async () => {
          await controller.getContentByVersions(orgId, mockRequest, {
            artifacts: defaultArtifacts,
            agents: ['claude', 'invalid-agent', 'cursor'],
          });

          expect(
            mockDeploymentAdapter.getContentByVersions,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude', 'cursor'],
            }),
          );
        });
      });

      describe('with only invalid agent values', () => {
        it('passes empty agents array to the adapter', async () => {
          await controller.getContentByVersions(orgId, mockRequest, {
            artifacts: defaultArtifacts,
            agents: ['invalid-agent'],
          });

          expect(
            mockDeploymentAdapter.getContentByVersions,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: [],
            }),
          );
        });
      });
    });

    describe('when agents is not provided in body', () => {
      it('does not pass agents to the adapter', async () => {
        await controller.getContentByVersions(orgId, mockRequest, {
          artifacts: defaultArtifacts,
        });

        expect(mockDeploymentAdapter.getContentByVersions).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: undefined,
          }),
        );
      });
    });
  });

  describe('listUserSpaces', () => {
    const orgId = createOrganizationId('org-123');
    const mockRequest = {
      user: { userId: 'user-123' },
    } as AuthenticatedRequest;

    describe('when the organization has spaces', () => {
      const space1 = spaceFactory({ organizationId: orgId });
      const space2 = spaceFactory({ organizationId: orgId });
      const mockSpaces: ListUserSpacesResponse = { spaces: [space1, space2] };

      beforeEach(() => {
        mockSpacesAdapter.listUserSpaces.mockResolvedValue(mockSpaces);
      });

      it('calls adapter with correct command', async () => {
        await controller.listUserSpaces(orgId, mockRequest);

        expect(mockSpacesAdapter.listUserSpaces).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId: orgId,
        });
      });
    });
  });
});
