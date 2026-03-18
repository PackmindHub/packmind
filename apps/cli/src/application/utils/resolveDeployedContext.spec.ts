import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  createMockDeploymentGateway,
  createMockPackmindGateway,
} from '../../mocks/createMockGateways';
import { resolveDeployedContext } from './resolveDeployedContext';
import { GetDeployedContentResponse } from '@packmind/types';
import { IDeploymentGateway } from '../../domain/repositories/IDeploymentGateway';

describe('resolveDeployedContext', () => {
  let mockGetDefaultSpace: jest.Mock;
  let mockReadFullConfig: jest.Mock;
  let mockTryGetGitRepositoryRoot: jest.Mock;
  let mockGetGitRemoteUrlFromPath: jest.Mock;
  let mockGetCurrentBranch: jest.Mock;
  let mockDeploymentGateway: jest.Mocked<IDeploymentGateway>;
  let packmindCliHexa: PackmindCliHexa;

  const defaultSpace = {
    id: 'space-123',
    name: 'Global',
    slug: 'global',
    organizationId: 'org-1',
  };

  const deployedContentResponse: GetDeployedContentResponse = {
    targetId: 'target-abc' as GetDeployedContentResponse['targetId'],
    fileUpdates: [],
  };

  beforeEach(() => {
    mockGetDefaultSpace = jest.fn().mockResolvedValue(defaultSpace);
    mockReadFullConfig = jest.fn().mockResolvedValue({
      packages: { '@space/pkg-a': '*', '@space/pkg-b': '*' },
    });
    mockTryGetGitRepositoryRoot = jest.fn().mockResolvedValue('/git-root');
    mockGetGitRemoteUrlFromPath = jest
      .fn()
      .mockReturnValue('git@github.com:org/repo.git');
    mockGetCurrentBranch = jest.fn().mockReturnValue('main');
    mockDeploymentGateway = createMockDeploymentGateway({
      getDeployed: jest.fn().mockResolvedValue(deployedContentResponse),
    });

    packmindCliHexa = {
      getDefaultSpace: mockGetDefaultSpace,
      readFullConfig: mockReadFullConfig,
      tryGetGitRepositoryRoot: mockTryGetGitRepositoryRoot,
      getGitRemoteUrlFromPath: mockGetGitRemoteUrlFromPath,
      getCurrentBranch: mockGetCurrentBranch,
      getPackmindGateway: () =>
        createMockPackmindGateway({ deployment: mockDeploymentGateway }),
    } as unknown as PackmindCliHexa;
  });

  describe('when all git context is available', () => {
    it('returns spaceId from default space', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result?.spaceId).toBe('space-123');
    });

    it('returns targetId from deployed content', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result?.targetId).toBe('target-abc');
    });

    it('returns deployedContent from gateway', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result?.deployedContent).toBe(deployedContentResponse);
    });

    it('calls getDeployed with correct parameters', async () => {
      await resolveDeployedContext(packmindCliHexa, '/git-root/sub-dir');

      expect(mockDeploymentGateway.getDeployed).toHaveBeenCalledWith({
        packagesSlugs: ['@space/pkg-a', '@space/pkg-b'],
        gitRemoteUrl: 'git@github.com:org/repo.git',
        gitBranch: 'main',
        relativePath: '/sub-dir/',
        agents: undefined,
      });
    });

    describe('when targetDir is git root', () => {
      it('uses / as relativePath', async () => {
        await resolveDeployedContext(packmindCliHexa, '/git-root');

        expect(mockDeploymentGateway.getDeployed).toHaveBeenCalledWith(
          expect.objectContaining({ relativePath: '/' }),
        );
      });
    });

    describe('when config has agents', () => {
      it('passes agents to getDeployed', async () => {
        const agents = [{ name: 'claude' }];
        mockReadFullConfig.mockResolvedValue({
          packages: { '@space/pkg': '*' },
          agents,
        });

        await resolveDeployedContext(packmindCliHexa, '/git-root/sub-dir');

        expect(mockDeploymentGateway.getDeployed).toHaveBeenCalledWith(
          expect.objectContaining({ agents }),
        );
      });
    });
  });

  describe('when git root is not found', () => {
    beforeEach(() => {
      mockTryGetGitRepositoryRoot.mockResolvedValue(null);
    });

    it('returns null', async () => {
      const result = await resolveDeployedContext(packmindCliHexa, '/some/dir');

      expect(result).toBeNull();
    });
  });

  describe('when config has no packages', () => {
    beforeEach(() => {
      mockReadFullConfig.mockResolvedValue({ packages: {} });
    });

    it('returns null', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result).toBeNull();
    });
  });

  describe('when config is null', () => {
    beforeEach(() => {
      mockReadFullConfig.mockResolvedValue(null);
    });

    it('returns null', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result).toBeNull();
    });
  });

  describe('when an error is thrown', () => {
    beforeEach(() => {
      mockReadFullConfig.mockRejectedValue(new Error('read failed'));
    });

    it('returns null', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result).toBeNull();
    });
  });

  describe('when getDefaultSpace fails', () => {
    beforeEach(() => {
      mockGetDefaultSpace.mockRejectedValue(new Error('space error'));
    });

    it('returns null', async () => {
      const result = await resolveDeployedContext(
        packmindCliHexa,
        '/git-root/sub-dir',
      );

      expect(result).toBeNull();
    });
  });

  describe('when targetDir is outside git root', () => {
    it('uses / as relativePath', async () => {
      mockTryGetGitRepositoryRoot.mockResolvedValue('/other-root');

      await resolveDeployedContext(packmindCliHexa, '/somewhere-else');

      expect(mockDeploymentGateway.getDeployed).toHaveBeenCalledWith(
        expect.objectContaining({ relativePath: '/' }),
      );
    });
  });
});
