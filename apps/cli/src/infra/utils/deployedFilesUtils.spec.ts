import * as os from 'os';
import * as path from 'path';

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

  describe('when projectDir is the claude home agent directory', () => {
    const homeClaudeDir = path.join(os.homedir(), '.claude');
    const serverFiles = [
      { path: '.claude/commands/my-command.md', content: 'deployed cmd' },
      {
        path: '.claude/rules/packmind/standard-foo.md',
        content: 'deployed std',
      },
      { path: '.claude/skills/my-skill/SKILL.md', content: 'deployed skill' },
      { path: '.packmind/standards/foo.md', content: 'mirror' },
      { path: 'CLAUDE.md', content: 'root claude md' },
    ];
    let gateway: DeploymentGateway;
    let lockFile: PackmindLockFile;

    beforeEach(() => {
      gateway = {
        deployment: {
          getContentByVersions: jest.fn().mockResolvedValue({
            fileUpdates: { createOrUpdate: serverFiles },
          }),
        },
      };
      lockFile = {
        lockfileVersion: 2,
        packageSlugs: [],
        agents: ['claude'],
        installedAt: '2026-01-01',
        artifacts: {},
      };
    });

    it('strips the agent home prefix from returned file paths', async () => {
      const result = await fetchDeployedFiles(gateway, lockFile, {
        projectDir: homeClaudeDir,
      });
      const paths = result.map((f) => f.path);
      expect(paths).toEqual(
        expect.arrayContaining([
          'commands/my-command.md',
          'rules/packmind/standard-foo.md',
          'skills/my-skill/SKILL.md',
          'CLAUDE.md',
        ]),
      );
    });

    it('drops .packmind/ mirror entries', async () => {
      const result = await fetchDeployedFiles(gateway, lockFile, {
        projectDir: homeClaudeDir,
      });
      expect(result.some((f) => f.path.startsWith('.packmind/'))).toBe(false);
    });
  });

  describe('when projectDir is a normal repo directory', () => {
    it('does not remap paths', async () => {
      const serverFiles = [
        { path: '.claude/commands/my-command.md', content: 'cmd' },
        { path: '.packmind/standards/foo.md', content: 'mirror' },
      ];
      const gateway: DeploymentGateway = {
        deployment: {
          getContentByVersions: jest.fn().mockResolvedValue({
            fileUpdates: { createOrUpdate: serverFiles },
          }),
        },
      };
      const lockFile: PackmindLockFile = {
        lockfileVersion: 2,
        packageSlugs: [],
        agents: ['claude'],
        installedAt: '2026-01-01',
        artifacts: {},
      };

      const result = await fetchDeployedFiles(gateway, lockFile, {
        projectDir: '/some/repo',
      });
      expect(result).toEqual(serverFiles);
    });
  });
});
