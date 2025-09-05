import { AddGitRepoUseCase } from './addGitRepo.usecase';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { AddGitRepoCommand } from '../../../domain/useCases/IAddGitRepo';
import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  GitProviderVendors,
} from '../../../domain/entities/GitProvider';
import { GitRepo, createGitRepoId } from '../../../domain/entities/GitRepo';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

describe('AddGitRepoUseCase', () => {
  let useCase: AddGitRepoUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    mockGitRepoService = {
      findGitRepoByOwnerRepoAndBranchInOrganization: jest.fn(),
      addGitRepo: jest.fn(),
    } as Partial<jest.Mocked<GitRepoService>> as jest.Mocked<GitRepoService>;

    useCase = new AddGitRepoUseCase(mockGitProviderService, mockGitRepoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding a valid repository', () => {
    it('creates repository successfully with no conflicts', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const expectedResult: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      const result = await useCase.execute(command);

      expect(result).toEqual(expectedResult);
      expect(mockGitProviderService.findGitProviderById).toHaveBeenCalledWith(
        gitProviderId,
      );
      expect(
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization,
      ).toHaveBeenCalledWith('testowner', 'testrepo', 'main', organizationId);
      expect(mockGitRepoService.addGitRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      });
    });

    it('allows same repository with different branch', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop', // Different branch
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const expectedResult: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop',
        providerId: gitProviderId,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      const result = await useCase.execute(command);

      expect(result).toEqual(expectedResult);
      expect(
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization,
      ).toHaveBeenCalledWith(
        'testowner',
        'testrepo',
        'develop',
        organizationId,
      );
    });
  });

  describe('validation errors', () => {
    it('throws error for missing git provider ID', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId: '' as GitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Git provider ID is required',
      );
    });

    it('throws error for missing owner', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: '',
        repo: 'testrepo',
        branch: 'main',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Owner, repository name, and branch are all required',
      );
    });

    it('throws error for missing repo', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: '',
        branch: 'main',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Owner, repository name, and branch are all required',
      );
    });

    it('throws error for missing branch', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: '',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Owner, repository name, and branch are all required',
      );
    });

    it('throws error for git provider not found', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Git provider not found',
      );
    });

    it('throws error for git provider belonging to different organization', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId: createOrganizationId(uuidv4()), // Different organization
        url: 'https://github.com',
        token: 'token',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'Git provider does not belong to the specified organization',
      );
    });

    it('throws error for duplicate repository with same owner/repo/branch in organization', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const existingRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        existingRepo,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        "Repository testowner/testrepo on branch 'main' already exists in this organization",
      );
    });
  });
});
