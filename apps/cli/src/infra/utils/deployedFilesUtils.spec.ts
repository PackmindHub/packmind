import {
  DeploymentGateway,
  fetchDeployedFiles,
  lockFileToArtifactVersionEntries,
} from './deployedFilesUtils';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

describe('lockFileToArtifactVersionEntries', () => {
  it('maps lock file artifacts to version entries', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      installedAt: '2026-01-01',
      artifacts: {
        'art-1': {
          name: 'My Standard',
          type: 'standard',
          id: 'art-1',
          version: 2,
          spaceId: 'sp-1',
          packageIds: ['pkg-1'],
          files: [{ path: '.claude/rules/my-standard.md', agent: 'claude' }],
        },
      },
    };

    const result = lockFileToArtifactVersionEntries(lockFile);
    expect(result).toEqual([
      {
        name: 'My Standard',
        type: 'standard',
        id: 'art-1',
        version: 2,
        spaceId: 'sp-1',
      },
    ]);
  });
});

describe('fetchDeployedFiles', () => {
  it('returns createOrUpdate files from gateway', async () => {
    const files = [{ path: '.claude/rules/x.md', content: 'hello' }];
    const gateway: DeploymentGateway = {
      deployment: {
        getContentByVersions: jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: files },
        }),
      },
    };
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: ['claude'],
      installedAt: '2026-01-01',
      artifacts: {
        'art-1': {
          name: 'X',
          type: 'standard',
          id: 'art-1',
          version: 1,
          spaceId: 'sp-1',
          packageIds: [],
          files: [{ path: '.claude/rules/x.md', agent: 'claude' }],
        },
      },
    };

    const result = await fetchDeployedFiles(gateway, lockFile);
    expect(result).toEqual(files);
    expect(gateway.deployment.getContentByVersions).toHaveBeenCalledWith({
      artifacts: [
        {
          name: 'X',
          type: 'standard',
          id: 'art-1',
          version: 1,
          spaceId: 'sp-1',
        },
      ],
      agents: lockFile.agents,
    });
  });

  it('returns empty array on error', async () => {
    const gateway: DeploymentGateway = {
      deployment: {
        getContentByVersions: jest.fn().mockRejectedValue(new Error('fail')),
      },
    };
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      installedAt: '2026-01-01',
      artifacts: {},
    };

    const result = await fetchDeployedFiles(gateway, lockFile);
    expect(result).toEqual([]);
  });
});
