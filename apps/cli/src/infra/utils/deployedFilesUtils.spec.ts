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
  describe('returns createOrUpdate files from gateway', () => {
    const files = [{ path: '.claude/rules/x.md', content: 'hello' }];
    let gateway: DeploymentGateway;
    let lockFile: PackmindLockFile;
    let result: typeof files;

    beforeEach(async () => {
      gateway = {
        deployment: {
          getContentByVersions: jest.fn().mockResolvedValue({
            fileUpdates: { createOrUpdate: files },
          }),
        },
      };
      lockFile = {
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
      result = await fetchDeployedFiles(gateway, lockFile);
    });

    it('returns the files', () => {
      expect(result).toEqual(files);
    });

    it('calls getContentByVersions with correct artifacts', () => {
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
