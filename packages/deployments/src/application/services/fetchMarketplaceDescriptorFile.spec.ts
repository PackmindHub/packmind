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

  it('returns the descriptor from the official .claude-plugin path when present', async () => {
    const getFileFromRepo = jest
      .fn()
      .mockResolvedValue({ sha: 'sha-1', content: '{"plugins":[]}' });
    const gitPort = makeGitPort(getFileFromRepo);

    const result = await fetchMarketplaceDescriptorFile(
      gitPort,
      gitRepo,
      'main',
    );

    expect(result).toEqual({
      path: '.claude-plugin/marketplace.json',
      sha: 'sha-1',
      content: '{"plugins":[]}',
    });
    expect(getFileFromRepo).toHaveBeenCalledTimes(1);
    expect(getFileFromRepo).toHaveBeenCalledWith(
      gitRepo,
      '.claude-plugin/marketplace.json',
      'main',
    );
  });

  it('falls back to the root marketplace.json when the official path is missing', async () => {
    const getFileFromRepo = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ sha: 'sha-2', content: '{"plugins":[]}' });
    const gitPort = makeGitPort(getFileFromRepo);

    const result = await fetchMarketplaceDescriptorFile(
      gitPort,
      gitRepo,
      'main',
    );

    expect(result).toEqual({
      path: 'marketplace.json',
      sha: 'sha-2',
      content: '{"plugins":[]}',
    });
    expect(getFileFromRepo).toHaveBeenCalledTimes(2);
    expect(getFileFromRepo).toHaveBeenNthCalledWith(
      2,
      gitRepo,
      'marketplace.json',
      'main',
    );
  });

  it('returns null when no candidate path exists', async () => {
    const getFileFromRepo = jest.fn().mockResolvedValue(null);
    const gitPort = makeGitPort(getFileFromRepo);

    const result = await fetchMarketplaceDescriptorFile(
      gitPort,
      gitRepo,
      'main',
    );

    expect(result).toBeNull();
    expect(getFileFromRepo).toHaveBeenCalledTimes(2);
  });

  it('propagates transport errors instead of probing further', async () => {
    const getFileFromRepo = jest
      .fn()
      .mockRejectedValue(new Error('network down'));
    const gitPort = makeGitPort(getFileFromRepo);

    await expect(
      fetchMarketplaceDescriptorFile(gitPort, gitRepo, 'main'),
    ).rejects.toThrow('network down');
    expect(getFileFromRepo).toHaveBeenCalledTimes(1);
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
