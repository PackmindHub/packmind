import { GitRepo, IGitPort } from '@packmind/types';
import { fetchMarketplaceDescriptorFile } from './fetchMarketplaceDescriptorFile';

describe('fetchMarketplaceDescriptorFile', () => {
  const gitRepo = {
    id: 'repo-1',
    owner: 'acme',
    repo: 'marketplace',
    branch: 'main',
    providerId: 'gp-1',
    type: 'marketplace',
  } as unknown as GitRepo;

  function makeGitPort(getFileFromRepo: jest.Mock): IGitPort {
    return { getFileFromRepo } as unknown as IGitPort;
  }

  describe('when the official .claude-plugin path is present', () => {
    let getFileFromRepo: jest.Mock;
    let result: Awaited<ReturnType<typeof fetchMarketplaceDescriptorFile>>;

    beforeEach(async () => {
      getFileFromRepo = jest
        .fn()
        .mockResolvedValue({ sha: 'sha-1', content: '{"plugins":[]}' });
      const gitPort = makeGitPort(getFileFromRepo);

      result = await fetchMarketplaceDescriptorFile(gitPort, gitRepo, 'main');
    });

    it('returns the descriptor from the official .claude-plugin path', () => {
      expect(result).toEqual({
        path: '.claude-plugin/marketplace.json',
        sha: 'sha-1',
        content: '{"plugins":[]}',
      });
    });

    it('probes a single path', () => {
      expect(getFileFromRepo).toHaveBeenCalledTimes(1);
    });

    it('probes the official .claude-plugin path', () => {
      expect(getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        '.claude-plugin/marketplace.json',
        'main',
      );
    });
  });

  describe('when the official path is missing', () => {
    let getFileFromRepo: jest.Mock;
    let result: Awaited<ReturnType<typeof fetchMarketplaceDescriptorFile>>;

    beforeEach(async () => {
      getFileFromRepo = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ sha: 'sha-2', content: '{"plugins":[]}' });
      const gitPort = makeGitPort(getFileFromRepo);

      result = await fetchMarketplaceDescriptorFile(gitPort, gitRepo, 'main');
    });

    it('falls back to the root marketplace.json', () => {
      expect(result).toEqual({
        path: 'marketplace.json',
        sha: 'sha-2',
        content: '{"plugins":[]}',
      });
    });

    it('probes both candidate paths', () => {
      expect(getFileFromRepo).toHaveBeenCalledTimes(2);
    });

    it('probes the root marketplace.json on the second attempt', () => {
      expect(getFileFromRepo).toHaveBeenNthCalledWith(
        2,
        gitRepo,
        'marketplace.json',
        'main',
      );
    });
  });

  describe('when no candidate path exists', () => {
    let getFileFromRepo: jest.Mock;
    let result: Awaited<ReturnType<typeof fetchMarketplaceDescriptorFile>>;

    beforeEach(async () => {
      getFileFromRepo = jest.fn().mockResolvedValue(null);
      const gitPort = makeGitPort(getFileFromRepo);

      result = await fetchMarketplaceDescriptorFile(gitPort, gitRepo, 'main');
    });

    it('returns null', () => {
      expect(result).toBeNull();
    });

    it('probes both candidate paths', () => {
      expect(getFileFromRepo).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the transport throws', () => {
    let getFileFromRepo: jest.Mock;
    let act: () => Promise<unknown>;

    beforeEach(async () => {
      getFileFromRepo = jest.fn().mockRejectedValue(new Error('network down'));
      const gitPort = makeGitPort(getFileFromRepo);

      act = () => fetchMarketplaceDescriptorFile(gitPort, gitRepo, 'main');

      await act().catch(() => undefined);
    });

    it('propagates the transport error', async () => {
      await expect(act()).rejects.toThrow('network down');
    });

    it('does not probe further', () => {
      expect(getFileFromRepo).toHaveBeenCalledTimes(1);
    });
  });

  it('forwards an undefined branch so the port uses the default branch', async () => {
    const getFileFromRepo = jest
      .fn()
      .mockResolvedValue({ sha: 'sha-1', content: '{"plugins":[]}' });
    const gitPort = makeGitPort(getFileFromRepo);

    await fetchMarketplaceDescriptorFile(gitPort, gitRepo);

    expect(getFileFromRepo).toHaveBeenCalledWith(
      gitRepo,
      '.claude-plugin/marketplace.json',
      undefined,
    );
  });
});
