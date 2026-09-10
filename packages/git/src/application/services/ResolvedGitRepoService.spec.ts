import { ResolvedGitRepoService } from './ResolvedGitRepoService';
import { IGitProviderRepository } from '../../domain/repositories/IGitProviderRepository';
import { IGitRepo } from '../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { GitRepoFactory } from '../../infra/repositories/GitRepoFactory';
import {
  GithubTokenResolverFactory,
  IConfigProvider,
} from '../../infra/repositories/github/auth/GithubTokenResolverFactory';
import { GitProvider, GitProviderNotFoundError } from '@packmind/types';
import { gitProviderFactory, gitRepoFactory } from '../../../test';
import { stubLogger } from '@packmind/test-utils';
import { instrumentComponents } from '@packmind/node-utils';

const stubGitRepoInstance = (): jest.Mocked<IGitRepo> =>
  ({
    getFileOnRepo: jest.fn(),
    commitFiles: jest.fn(),
    listDirectoriesOnRepo: jest.fn(),
    checkDirectoryExists: jest.fn(),
  }) as unknown as jest.Mocked<IGitRepo>;

describe('ResolvedGitRepoService', () => {
  let gitProviderRepository: jest.Mocked<IGitProviderRepository>;
  let gitRepoFactoryPort: jest.Mocked<IGitRepoFactory>;
  let service: ResolvedGitRepoService;
  let provider: GitProvider;

  beforeEach(() => {
    provider = gitProviderFactory();

    gitProviderRepository = {
      findById: jest.fn().mockResolvedValue(provider),
    } as unknown as jest.Mocked<IGitProviderRepository>;

    // A fresh instance per call, so "same instance" is a real assertion.
    gitRepoFactoryPort = {
      createGitRepo: jest
        .fn()
        .mockImplementation(async () => stubGitRepoInstance()),
    } as jest.Mocked<IGitRepoFactory>;

    service = new ResolvedGitRepoService(
      gitProviderRepository,
      gitRepoFactoryPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when the same repository is resolved again inside the window', () => {
    const gitRepo = gitRepoFactory();
    let first: IGitRepo;
    let second: IGitRepo;

    beforeEach(async () => {
      jest.useFakeTimers();
      gitProviderRepository.findById.mockResolvedValue(provider);

      first = await service.resolve(gitRepo);
      jest.advanceTimersByTime(5_000);
      second = await service.resolve(gitRepo);
    });

    it('hands back the very same instance', () => {
      expect(second).toBe(first);
    });

    it('builds the repository only once', () => {
      expect(gitRepoFactoryPort.createGitRepo).toHaveBeenCalledTimes(1);
    });

    it('reads the provider only once', () => {
      expect(gitProviderRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a deployment resolves one repository for many targets', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      const gitRepo = gitRepoFactory();

      for (let target = 0; target < 4; target++) {
        for (let file = 0; file < 5; file++) {
          await service.resolve(gitRepo);
        }
      }
    });

    it('builds the repository once rather than once per file per target', () => {
      expect(gitRepoFactoryPort.createGitRepo).toHaveBeenCalledTimes(1);
    });

    it('reads the provider once rather than once per file per target', () => {
      expect(gitProviderRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  // Both miss, both resolve, and the slower one used to overwrite the faster —
  // putting a client built from stale credentials back in front.
  describe('when two reads race on the same repository', () => {
    let first: IGitRepo;
    let second: IGitRepo;

    beforeEach(async () => {
      const gitRepo = gitRepoFactory();
      let resolveProvider: ((provider: GitProvider) => void) | undefined;
      gitProviderRepository.findById.mockReturnValue(
        new Promise<GitProvider>((resolve) => {
          resolveProvider = resolve;
        }),
      );

      const both = Promise.all([
        service.resolve(gitRepo),
        service.resolve(gitRepo),
      ]);
      resolveProvider?.(provider);
      [first, second] = await both;
    });

    it('hands both reads the same instance', () => {
      expect(second).toBe(first);
    });

    it('builds the repository once', () => {
      expect(gitRepoFactoryPort.createGitRepo).toHaveBeenCalledTimes(1);
    });

    it('reads the provider once', () => {
      expect(gitProviderRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the window has passed', () => {
    it('resolves again', async () => {
      jest.useFakeTimers();
      const gitRepo = gitRepoFactory();

      const first = await service.resolve(gitRepo);
      jest.advanceTimersByTime(11_000);
      const second = await service.resolve(gitRepo);

      expect(second).not.toBe(first);
    });

    it('does not extend the window on a hit', async () => {
      jest.useFakeTimers();
      const gitRepo = gitRepoFactory();

      await service.resolve(gitRepo);
      jest.advanceTimersByTime(6_000);
      await service.resolve(gitRepo);
      jest.advanceTimersByTime(5_000);
      await service.resolve(gitRepo);

      expect(gitRepoFactoryPort.createGitRepo).toHaveBeenCalledTimes(2);
    });
  });

  describe('when another branch of the same repository is resolved', () => {
    it('resolves it separately', async () => {
      const gitRepo = gitRepoFactory({ branch: 'main' });

      const first = await service.resolve(gitRepo);
      const second = await service.resolve({
        ...gitRepo,
        branch: 'release',
      });

      expect(second).not.toBe(first);
    });
  });

  describe('when the same repository is reached through another provider', () => {
    it('resolves it separately', async () => {
      const gitRepo = gitRepoFactory();
      const otherProvider = gitProviderFactory();

      const first = await service.resolve(gitRepo);
      gitProviderRepository.findById.mockResolvedValue(otherProvider);
      const second = await service.resolve({
        ...gitRepo,
        providerId: otherProvider.id,
      });

      expect(second).not.toBe(first);
    });
  });

  describe('when two repository rows point at the same branch through the same provider', () => {
    let first: IGitRepo;
    let second: IGitRepo;

    beforeEach(async () => {
      const gitRepo = gitRepoFactory({ providerId: provider.id });
      const sameRepoOtherRow = gitRepoFactory({
        providerId: provider.id,
        owner: gitRepo.owner,
        repo: gitRepo.repo,
        branch: gitRepo.branch,
      });

      first = await service.resolve(gitRepo);
      second = await service.resolve(sameRepoOtherRow);
    });

    it('hands back the very same instance', () => {
      expect(second).toBe(first);
    });

    it('builds the repository only once', () => {
      expect(gitRepoFactoryPort.createGitRepo).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the provider is not found', () => {
    beforeEach(() => {
      gitProviderRepository.findById.mockResolvedValue(null);
    });

    it('throws GitProviderNotFoundError', async () => {
      await expect(service.resolve(gitRepoFactory())).rejects.toThrow(
        GitProviderNotFoundError,
      );
    });

    describe('when the provider is found on the next read', () => {
      const gitRepo = gitRepoFactory();

      beforeEach(async () => {
        await service.resolve(gitRepo).catch(() => undefined);
        gitProviderRepository.findById.mockResolvedValue(provider);
      });

      it('resolves the repository', async () => {
        await expect(service.resolve(gitRepo)).resolves.toBeDefined();
      });
    });
  });

  describe('when building the repository fails', () => {
    const gitRepo = gitRepoFactory();

    beforeEach(async () => {
      gitRepoFactoryPort.createGitRepo.mockRejectedValueOnce(
        new Error('Git provider token not configured'),
      );
      await service.resolve(gitRepo).catch(() => undefined);
    });

    it('raises the failure', async () => {
      gitRepoFactoryPort.createGitRepo.mockRejectedValueOnce(
        new Error('Git provider token not configured'),
      );

      await expect(service.resolve(gitRepo)).rejects.toThrow(
        'Git provider token not configured',
      );
    });

    it('does not remember the failure', async () => {
      await expect(service.resolve(gitRepo)).resolves.toBeDefined();
    });
  });

  // The race fix relies on the cache write running before the caller can call
  // again. Instrumentation wraps `resolve`, so pin the invariant through it.
  describe('when instrumented and two reads race', () => {
    it('still builds the repository once', async () => {
      instrumentComponents([service]);
      const gitRepo = gitRepoFactory();

      await Promise.all([service.resolve(gitRepo), service.resolve(gitRepo)]);

      expect(gitRepoFactoryPort.createGitRepo).toHaveBeenCalledTimes(1);
    });
  });

  // Counting App credential reads counts how many token resolvers were built,
  // which bounds how many tokens could have been minted.
  describe('resolving through the real GitHub App auth chain', () => {
    class CountingConfig implements IConfigProvider {
      calls = 0;
      constructor(private readonly values: Record<string, string | null>) {}
      async getConfig(key: string): Promise<string | null> {
        this.calls += 1;
        return this.values[key] ?? null;
      }
    }

    let config: CountingConfig;

    beforeEach(async () => {
      jest.useFakeTimers();

      config = new CountingConfig({
        GITHUB_APP_ID: '123456',
        GITHUB_APP_PRIVATE_KEY:
          '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
      });

      const appProvider = gitProviderFactory({
        authMethod: 'app',
        appInstallationId: 987654,
        token: null,
      });

      gitProviderRepository.findById.mockResolvedValue(appProvider);

      service = new ResolvedGitRepoService(
        gitProviderRepository,
        new GitRepoFactory(
          new GithubTokenResolverFactory(config, 'shared', stubLogger()),
          stubLogger(),
        ),
        stubLogger(),
      );

      const gitRepo = gitRepoFactory({ providerId: appProvider.id });

      await service.resolve(gitRepo);
      jest.advanceTimersByTime(2_000);
      await service.resolve(gitRepo);
    });

    it('builds a single token resolver, so at most one token is minted', () => {
      expect(config.calls).toBe(2);
    });
  });
});
