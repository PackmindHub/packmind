import { mockInterface } from '@packmind/test-utils';
import * as fs from 'fs/promises';
import {
  InstallPackagesResponse,
  PackmindLockFile,
  PackmindLockFileEntry,
} from '@packmind/types';

import { CheckUpgradesUseCase } from './CheckUpgradesUseCase';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PackmindConfigNotFoundError } from '../../domain/errors/PackmindConfigNotFoundError';
import { PackmindConfigInvalidError } from '../../domain/errors/PackmindConfigInvalidError';

jest.mock('fs/promises');

const OPS_ID = 'pkg-ops';
const SECURITY_ID = 'pkg-security';

const lockEntry = (
  overrides: Partial<PackmindLockFileEntry> &
    Pick<PackmindLockFileEntry, 'type'>,
): PackmindLockFileEntry => ({
  name: '',
  id: `${overrides.type}-id`,
  version: 1,
  spaceId: 'space-1',
  packageIds: [OPS_ID],
  files: [],
  source: 'user',
  ...overrides,
});

const lockFileFactory = (
  artifacts: Record<string, PackmindLockFileEntry> = {},
): PackmindLockFile => ({
  lockfileVersion: 2,
  packageSlugs: ['@space/ops', '@space/security'],
  agents: [],
  artifacts,
});

const installResponseFactory = (
  overrides: Partial<InstallPackagesResponse> & {
    serverLockFile?: PackmindLockFile;
  } = {},
): InstallPackagesResponse => {
  const { serverLockFile, ...rest } = overrides;
  return {
    fileUpdates: {
      createOrUpdate: serverLockFile
        ? [
            {
              path: 'packmind-lock.json',
              content: JSON.stringify(serverLockFile),
            },
          ]
        : [],
      delete: [],
    },
    skillFolders: [],
    missingAccess: [],
    resolvedAgents: [],
    resolvedPackageVersions: { '@space/ops': '0.1.0', '@space/security': '*' },
    resolvedPackageIds: {
      '@space/ops': OPS_ID,
      '@space/security': SECURITY_ID,
    },
    sourceArtifacts: {
      skillsCount: 0,
      standardsCount: 0,
      commandsCount: 0,
      recipesCount: 0,
    },
    ...rest,
  };
};

describe('CheckUpgradesUseCase', () => {
  let useCase: CheckUpgradesUseCase;
  let mockGateway: ReturnType<typeof createMockPackmindGateway>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  let mockConfigFileRepository: jest.Mocked<IConfigFileRepository>;
  let mockSpaceService: jest.Mocked<ISpaceService>;

  const command = { baseDirectory: '/repo', cliVersion: '1.2.3' };
  const unchangedLockFile = lockFileFactory({
    'user:standard:ts-good-practices': lockEntry({
      type: 'standard',
      version: 2,
    }),
    'user:skill:review': lockEntry({
      type: 'skill',
      version: 1,
      packageIds: [SECURITY_ID],
    }),
  });

  beforeEach(() => {
    mockGateway = createMockPackmindGateway();
    mockLockFileRepository = mockInterface<ILockFileRepository>();
    mockConfigFileRepository = mockInterface<IConfigFileRepository>();
    mockSpaceService = mockInterface<ISpaceService>();

    mockConfigFileRepository.readConfig.mockResolvedValue({
      packages: { '@space/ops': '0.1.0', '@space/security': '*' },
    });
    mockLockFileRepository.read.mockResolvedValue(unchangedLockFile);
    mockGateway.deployment.install.mockResolvedValue(
      installResponseFactory({ serverLockFile: unchangedLockFile }),
    );

    useCase = new CheckUpgradesUseCase(
      mockGateway,
      mockLockFileRepository,
      mockConfigFileRepository,
      mockSpaceService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when calling the server', () => {
    beforeEach(async () => {
      await useCase.execute(command);
    });

    it('asks for a preview', () => {
      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({ preview: true }),
      );
    });

    it('releases exact pins and keeps the wildcard', () => {
      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({
          packagesSlugs: ['@space/ops', '@space/security'],
          packageVersions: { '@space/security': '*' },
        }),
      );
    });

    it('sends the local lock file with the running CLI version', () => {
      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({
          packmindLockFile: { ...unchangedLockFile, cliVersion: '1.2.3' },
        }),
      );
    });
  });

  describe('when nothing would change', () => {
    it('reports no upgrade', async () => {
      const result = await useCase.execute(command);

      expect(result.hasUpgrades).toBe(false);
    });

    it('reports the pinned package as already on its newest release', async () => {
      const result = await useCase.execute(command);

      expect(result.packages[0]).toEqual({
        slug: '@space/ops',
        from: '0.1.0',
        to: '0.1.0',
        artifacts: [],
      });
    });

    it('reports the wildcard package with no target version', async () => {
      const result = await useCase.execute(command);

      expect(result.packages[1]).toEqual({
        slug: '@space/security',
        from: '*',
        to: null,
        artifacts: [],
      });
    });
  });

  describe('when a pinned package has a newer release', () => {
    let result: Awaited<ReturnType<CheckUpgradesUseCase['execute']>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: lockFileFactory({
            'user:standard:ts-good-practices': lockEntry({
              type: 'standard',
              version: 4,
            }),
            'user:command:create-endpoint': lockEntry({
              type: 'command',
              version: 1,
            }),
            'user:skill:review': lockEntry({
              type: 'skill',
              version: 1,
              packageIds: [SECURITY_ID],
            }),
          }),
          resolvedPackageVersions: {
            '@space/ops': '0.3.0',
            '@space/security': '*',
          },
        }),
      );

      result = await useCase.execute(command);
    });

    it('reports an upgrade', () => {
      expect(result.hasUpgrades).toBe(true);
    });

    it('reports the version move', () => {
      expect(result.packages[0]).toMatchObject({
        slug: '@space/ops',
        from: '0.1.0',
        to: '0.3.0',
      });
    });

    it('lists the updated and added artifacts under the package', () => {
      expect(result.packages[0].artifacts).toEqual([
        {
          type: 'standard',
          name: 'ts-good-practices',
          change: 'updated',
          fromVersion: 2,
          toVersion: 4,
        },
        {
          type: 'command',
          name: 'create-endpoint',
          change: 'added',
          toVersion: 1,
        },
      ]);
    });

    it('lists nothing under the untouched package', () => {
      expect(result.packages[1].artifacts).toEqual([]);
    });
  });

  describe('when a wildcard package has changed artifacts', () => {
    let result: Awaited<ReturnType<CheckUpgradesUseCase['execute']>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: lockFileFactory({
            'user:standard:ts-good-practices': lockEntry({
              type: 'standard',
              version: 2,
            }),
          }),
        }),
      );

      result = await useCase.execute(command);
    });

    it('reports an upgrade', () => {
      expect(result.hasUpgrades).toBe(true);
    });

    it('lists the removed artifact under the package it came from', () => {
      expect(result.packages[1]).toEqual({
        slug: '@space/security',
        from: '*',
        to: null,
        artifacts: [
          {
            type: 'skill',
            name: 'review',
            change: 'removed',
            fromVersion: 1,
          },
        ],
      });
    });
  });

  describe('when a lock file entry carries a display name', () => {
    it('reports the artifact by that name', async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: lockFileFactory({
            'user:skill:create-endpoint': lockEntry({
              type: 'skill',
              name: 'Create endpoint',
            }),
          }),
        }),
      );

      const result = await useCase.execute(command);

      expect(
        result.packages[0].artifacts.find((a) => a.change === 'added'),
      ).toEqual({
        type: 'skill',
        name: 'Create endpoint',
        change: 'added',
        toVersion: 1,
      });
    });
  });

  describe('when a removed artifact belongs to no package of packmind.json', () => {
    it('reports it as unattributed', async () => {
      mockLockFileRepository.read.mockResolvedValue(
        lockFileFactory({
          ...unchangedLockFile.artifacts,
          'user:command:old-migration': lockEntry({
            type: 'command',
            version: 3,
            packageIds: ['pkg-gone'],
          }),
        }),
      );

      const result = await useCase.execute(command);

      expect(result.unattributedArtifacts).toEqual([
        {
          type: 'command',
          name: 'old-migration',
          change: 'removed',
          fromVersion: 3,
        },
      ]);
    });
  });

  describe('when the lock files differ only on default skills', () => {
    it('reports no upgrade', async () => {
      mockLockFileRepository.read.mockResolvedValue(
        lockFileFactory({
          ...unchangedLockFile.artifacts,
          'default:skill:packmind-onboard': lockEntry({
            type: 'skill',
            source: 'default',
            packageIds: [],
          }),
        }),
      );

      const result = await useCase.execute(command);

      expect(result.hasUpgrades).toBe(false);
    });
  });

  describe('when the user lacks access to a package', () => {
    let result: Awaited<ReturnType<CheckUpgradesUseCase['execute']>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: unchangedLockFile,
          missingAccess: ['@space/security'],
        }),
      );

      result = await useCase.execute(command);
    });

    it('reports it as missing access', () => {
      expect(result.missingAccess).toEqual(['@space/security']);
    });

    it('leaves it out of the packages', () => {
      expect(result.packages.map((pkg) => pkg.slug)).toEqual(['@space/ops']);
    });
  });

  describe('when packmind.json spells a package without its space', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue({
        packages: { ops: '0.1.0' },
      });
      mockSpaceService.getSpaces.mockResolvedValue([
        { slug: 'space' } as Awaited<ReturnType<ISpaceService['getSpaces']>>[0],
      ]);
      mockSpaceService.getDefaultSpace.mockResolvedValue({
        slug: 'space',
      } as Awaited<ReturnType<ISpaceService['getDefaultSpace']>>);
    });

    it('asks the server for the normalized slug', async () => {
      await useCase.execute(command);

      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({ packagesSlugs: ['@space/ops'] }),
      );
    });

    it('does not rewrite packmind.json', async () => {
      await useCase.execute(command);

      expect(mockConfigFileRepository.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe('when anything would change', () => {
    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: lockFileFactory({}),
          resolvedPackageVersions: {
            '@space/ops': '0.3.0',
            '@space/security': '*',
          },
        }),
      );

      await useCase.execute(command);
    });

    it('does not write packmind.json', () => {
      expect(mockConfigFileRepository.writeConfig).not.toHaveBeenCalled();
    });

    it('does not update packmind.json', () => {
      expect(mockConfigFileRepository.updateConfig).not.toHaveBeenCalled();
    });

    it('does not record resolved versions in packmind.json', () => {
      expect(
        mockConfigFileRepository.upsertPackagesInConfig,
      ).not.toHaveBeenCalled();
    });

    it('does not write the lock file', () => {
      expect(mockLockFileRepository.write).not.toHaveBeenCalled();
    });

    it('does not touch any file', () => {
      expect([
        (fs.writeFile as jest.Mock).mock.calls.length,
        (fs.mkdir as jest.Mock).mock.calls.length,
        (fs.unlink as jest.Mock).mock.calls.length,
        (fs.rm as jest.Mock).mock.calls.length,
      ]).toEqual([0, 0, 0, 0]);
    });
  });

  describe('when packmind.json lists no package', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue({ packages: {} });
    });

    it('does not call the server', async () => {
      await useCase.execute(command);

      expect(mockGateway.deployment.install).not.toHaveBeenCalled();
    });

    describe('and the lock file records installed artifacts', () => {
      let result: Awaited<ReturnType<CheckUpgradesUseCase['execute']>>;

      beforeEach(async () => {
        mockLockFileRepository.read.mockResolvedValue(
          lockFileFactory({
            ...unchangedLockFile.artifacts,
            'default:skill:packmind-onboard': lockEntry({
              type: 'skill',
              source: 'default',
              packageIds: [],
            }),
          }),
        );

        result = await useCase.execute(command);
      });

      it('reports an upgrade', () => {
        expect(result.hasUpgrades).toBe(true);
      });

      it('lists every user artifact as removed and unattributed', () => {
        expect(result.unattributedArtifacts).toEqual([
          {
            type: 'standard',
            name: 'ts-good-practices',
            change: 'removed',
            fromVersion: 2,
          },
          {
            type: 'skill',
            name: 'review',
            change: 'removed',
            fromVersion: 1,
          },
        ]);
      });
    });

    describe('and there is no lock file', () => {
      it('reports no upgrade', async () => {
        mockLockFileRepository.read.mockResolvedValue(null);

        const result = await useCase.execute(command);

        expect(result.hasUpgrades).toBe(false);
      });
    });

    describe('and the lock file only records default skills', () => {
      it('reports no upgrade', async () => {
        mockLockFileRepository.read.mockResolvedValue(
          lockFileFactory({
            'default:skill:packmind-onboard': lockEntry({
              type: 'skill',
              source: 'default',
              packageIds: [],
            }),
          }),
        );

        const result = await useCase.execute(command);

        expect(result.hasUpgrades).toBe(false);
      });
    });
  });

  describe('when the coding agents change', () => {
    let result: Awaited<ReturnType<CheckUpgradesUseCase['execute']>>;

    beforeEach(async () => {
      mockLockFileRepository.read.mockResolvedValue({
        ...lockFileFactory({
          'user:standard:ts-good-practices': lockEntry({
            type: 'standard',
            version: 2,
            files: [{ path: 'CLAUDE.md', agent: 'claude' }],
          }),
        }),
        agents: ['claude', 'packmind'],
      });
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: {
            ...lockFileFactory({
              'user:standard:ts-good-practices': lockEntry({
                type: 'standard',
                version: 2,
                files: [
                  { path: 'CLAUDE.md', agent: 'claude' },
                  {
                    path: '.cursor/rules/packmind/ts-good-practices.mdc',
                    agent: 'cursor',
                  },
                ],
              }),
            }),
            agents: ['cursor', 'claude', 'packmind'],
          },
        }),
      );

      result = await useCase.execute(command);
    });

    it('reports an upgrade', () => {
      expect(result.hasUpgrades).toBe(true);
    });

    it('reports the agents move without the internal packmind agent', () => {
      expect(result.agents).toEqual({
        from: ['claude'],
        to: ['claude', 'cursor'],
      });
    });

    it('lists the artifacts written to other files as rerendered', () => {
      expect(result.packages[0].artifacts).toEqual([
        {
          type: 'standard',
          name: 'ts-good-practices',
          change: 'rerendered',
          fromVersion: 2,
          toVersion: 2,
        },
      ]);
    });
  });

  describe('when the coding agents and file paths stay the same', () => {
    let result: Awaited<ReturnType<CheckUpgradesUseCase['execute']>>;

    beforeEach(async () => {
      const lockFile: PackmindLockFile = {
        ...lockFileFactory({
          'user:standard:ts-good-practices': lockEntry({
            type: 'standard',
            version: 2,
            files: [
              { path: 'CLAUDE.md', agent: 'claude' },
              { path: '.cursor/rules/packmind/ts.mdc', agent: 'cursor' },
            ],
          }),
        }),
        agents: ['claude', 'cursor'],
      };
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: {
            ...lockFile,
            agents: ['cursor', 'claude'],
            artifacts: {
              'user:standard:ts-good-practices': {
                ...lockFile.artifacts['user:standard:ts-good-practices'],
                files: [
                  { path: '.cursor/rules/packmind/ts.mdc', agent: 'cursor' },
                  { path: 'CLAUDE.md', agent: 'claude' },
                ],
              },
            },
          },
        }),
      );

      result = await useCase.execute(command);
    });

    it('reports no upgrade', () => {
      expect(result.hasUpgrades).toBe(false);
    });

    it('reports no agents move', () => {
      expect(result.agents).toBeNull();
    });
  });

  describe('when there is no local lock file', () => {
    it('reports no agents move', async () => {
      mockLockFileRepository.read.mockResolvedValue(null);
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          serverLockFile: { ...unchangedLockFile, agents: ['claude'] },
        }),
      );

      const result = await useCase.execute(command);

      expect(result.agents).toBeNull();
    });
  });

  describe('when there is no packmind.json', () => {
    it('throws PackmindConfigNotFoundError', async () => {
      mockConfigFileRepository.readConfig.mockResolvedValue(null);
      mockConfigFileRepository.configExists.mockResolvedValue(false);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        PackmindConfigNotFoundError,
      );
    });
  });

  describe('when packmind.json cannot be parsed', () => {
    it('throws PackmindConfigInvalidError', async () => {
      mockConfigFileRepository.readConfig.mockResolvedValue(null);
      mockConfigFileRepository.configExists.mockResolvedValue(true);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        PackmindConfigInvalidError,
      );
    });
  });
});
