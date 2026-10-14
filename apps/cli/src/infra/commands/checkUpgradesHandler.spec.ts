import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { PackmindCliHexa } from '../../PackmindCliHexa';
import { ICheckUpgradesResult } from '../../domain/useCases/ICheckUpgradesUseCase';
import { PackmindConfigInvalidError } from '../../domain/errors/PackmindConfigInvalidError';
import {
  checkUpgradesHandler,
  findCheckUpgradesConflict,
} from './checkUpgradesHandler';
import { EXEC_NAME } from '../utils/execName';

jest.mock('../utils/errorLog', () => ({
  recordReportedMessage: jest.fn(),
}));

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

const resultFactory = (
  overrides: Partial<ICheckUpgradesResult> = {},
): ICheckUpgradesResult => ({
  hasUpgrades: false,
  packages: [],
  unattributedArtifacts: [],
  missingAccess: [],
  agents: null,
  ...overrides,
});

const upgradableResult = resultFactory({
  hasUpgrades: true,
  packages: [
    {
      slug: '@space/backend',
      from: '0.1.0',
      to: '0.3.0',
      artifacts: [
        {
          type: 'standard',
          name: 'typescript-good-practices',
          change: 'updated',
          fromVersion: 2,
          toVersion: 4,
        },
        {
          type: 'skill',
          name: 'create-endpoint',
          change: 'added',
          toVersion: 1,
        },
        {
          type: 'command',
          name: 'old-migration',
          change: 'removed',
          fromVersion: 3,
        },
      ],
    },
    {
      slug: '@space/frontend',
      from: '*',
      to: null,
      artifacts: [
        {
          type: 'standard',
          name: 'react',
          change: 'updated',
          fromVersion: 1,
          toVersion: 2,
        },
      ],
    },
    { slug: '@space/infra', from: '0.2.0', to: '0.2.0', artifacts: [] },
  ],
});

const upToDateResult = resultFactory({
  packages: [
    { slug: '@space/infra', from: '0.2.0', to: '0.2.0', artifacts: [] },
    { slug: '@space/live', from: '*', to: null, artifacts: [] },
  ],
});

describe('checkUpgradesHandler', () => {
  let rootDir: string;
  let output: string[];
  let errors: string[];
  let warnings: string[];
  let mockCheckUpgrades: jest.Mock;
  let mockExit: jest.Mock;
  let packmindCliHexa: PackmindCliHexa;

  const collect =
    (into: string[]) =>
    (...parts: unknown[]) => {
      into.push(parts.map(String).join(' ').replace(ANSI_PATTERN, ''));
    };

  const writeConfig = (dir: string) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'packmind.json'),
      JSON.stringify({ packages: { '@space/infra': '0.2.0' } }),
    );
  };

  const run = (installPath = '') =>
    checkUpgradesHandler(
      { cwd: rootDir, installPath, cliVersion: '1.2.3' },
      { packmindCliHexa, exit: mockExit },
    );

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-upgrades-'));
    output = [];
    errors = [];
    warnings = [];
    jest.spyOn(console, 'log').mockImplementation(collect(output));
    jest.spyOn(console, 'error').mockImplementation(collect(errors));
    jest.spyOn(console, 'warn').mockImplementation(collect(warnings));

    mockCheckUpgrades = jest.fn().mockResolvedValue(upToDateResult);
    mockExit = jest.fn();
    packmindCliHexa = {
      checkUpgrades: mockCheckUpgrades,
    } as unknown as PackmindCliHexa;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  describe('when there is no packmind.json', () => {
    beforeEach(async () => {
      await run();
    });

    it('explains there is nothing to check', () => {
      expect(errors).toEqual([
        expect.stringContaining('No packmind.json found'),
      ]);
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not create packmind.json', () => {
      expect(fs.existsSync(path.join(rootDir, 'packmind.json'))).toBe(false);
    });

    it('does not check anything', () => {
      expect(mockCheckUpgrades).not.toHaveBeenCalled();
    });
  });

  describe('when nothing would change', () => {
    beforeEach(async () => {
      writeConfig(rootDir);
      await run();
    });

    it('checks the directory with the running CLI version', () => {
      expect(mockCheckUpgrades).toHaveBeenCalledWith({
        baseDirectory: rootDir,
        cliVersion: '1.2.3',
      });
    });

    it('prints each package as up to date', () => {
      expect(output.slice(0, 2)).toEqual([
        '@space/infra  0.2.0 · already on the newest release',
        '@space/live  * · up to date',
      ]);
    });

    it('prints "Already up to date"', () => {
      expect(output.at(-1)).toContain('Already up to date');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when upgrades are available', () => {
    beforeEach(async () => {
      writeConfig(rootDir);
      mockCheckUpgrades.mockResolvedValue(upgradableResult);
      await run();
    });

    it('prints the version move of a pinned package', () => {
      expect(output).toContain('@space/backend  0.1.0 → 0.3.0');
    });

    it('prints an updated artifact with its versions', () => {
      expect(output).toContain(
        '  ~ standard  typescript-good-practices  v2 → v4',
      );
    });

    it('prints an added artifact', () => {
      expect(output).toContain(
        '  + skill     create-endpoint            (new)',
      );
    });

    it('prints a removed artifact', () => {
      expect(output).toContain(
        '  - command   old-migration              (removed)',
      );
    });

    it('prints the component count of a wildcard package', () => {
      expect(output).toContain('@space/frontend  * · 1 component to update');
    });

    it('prints a pinned package already on its newest release', () => {
      expect(output).toContain(
        '@space/infra  0.2.0 · already on the newest release',
      );
    });

    it('suggests running the upgrade', () => {
      expect(output.at(-1)).toBe(
        `Run ${EXEC_NAME} install --upgrade to apply these changes.`,
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when an artifact belongs to no package of packmind.json', () => {
    it('lists it apart', async () => {
      writeConfig(rootDir);
      mockCheckUpgrades.mockResolvedValue(
        resultFactory({
          hasUpgrades: true,
          unattributedArtifacts: [
            {
              type: 'command',
              name: 'leftover',
              change: 'removed',
              fromVersion: 1,
            },
          ],
        }),
      );

      await run();

      expect(output.slice(0, 2)).toEqual([
        'Not from any package of packmind.json',
        '  - command   leftover  (removed)',
      ]);
    });
  });

  describe('when the user lacks access to packages', () => {
    describe('and nothing else would change', () => {
      beforeEach(async () => {
        writeConfig(rootDir);
        mockCheckUpgrades.mockResolvedValue(
          resultFactory({ missingAccess: ['@a/b', '@c/d'] }),
        );
        await run();
      });

      it('says which packages could not be checked', () => {
        expect(warnings).toEqual([
          expect.stringContaining(
            "Could not check 2 packages you don't have access to: @a/b, @c/d",
          ),
        ]);
      });

      it('does not print "Already up to date"', () => {
        expect(output.join('\n')).not.toContain('Already up to date');
      });

      it('exits with code 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('and upgrades are available', () => {
      it('exits with code 1', async () => {
        writeConfig(rootDir);
        mockCheckUpgrades.mockResolvedValue({
          ...upgradableResult,
          missingAccess: ['@a/b'],
        });

        await run();

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when the coding agents change', () => {
    beforeEach(async () => {
      writeConfig(rootDir);
      mockCheckUpgrades.mockResolvedValue(
        resultFactory({
          hasUpgrades: true,
          agents: { from: ['claude'], to: ['claude', 'cursor'] },
          packages: [
            {
              slug: '@space/infra',
              from: '0.2.0',
              to: '0.2.0',
              artifacts: [
                {
                  type: 'standard',
                  name: 'react',
                  change: 'rerendered',
                  fromVersion: 2,
                  toVersion: 2,
                },
              ],
            },
          ],
        }),
      );
      await run();
    });

    it('prints the agents move before the packages', () => {
      expect(output.slice(0, 2)).toEqual([
        'Coding agents: claude → claude, cursor',
        '@space/infra  0.2.0 · 1 component to update',
      ]);
    });

    it('prints a rerendered artifact as a files change', () => {
      expect(output).toContain('  ~ standard  react  (files change)');
    });
  });

  describe('when every coding agent is removed', () => {
    it('prints the empty list as none', async () => {
      writeConfig(rootDir);
      mockCheckUpgrades.mockResolvedValue(
        resultFactory({
          hasUpgrades: true,
          agents: { from: ['claude'], to: [] },
        }),
      );

      await run();

      expect(output[0]).toBe('Coding agents: claude → none');
    });
  });

  describe('when packmind.json files live in sub-directories', () => {
    const frontend = () => path.join(rootDir, 'apps', 'frontend');
    const backend = () => path.join(rootDir, 'apps', 'backend');

    beforeEach(async () => {
      writeConfig(rootDir);
      writeConfig(frontend());
      writeConfig(backend());
      await run();
    });

    it('checks every directory', () => {
      expect(
        mockCheckUpgrades.mock.calls.map(([cmd]) => cmd.baseDirectory).sort(),
      ).toEqual([rootDir, backend(), frontend()].sort());
    });

    it('prints one section per packmind.json', () => {
      expect(
        output.filter((line) => line.endsWith('packmind.json')).sort(),
      ).toEqual(
        [
          'packmind.json',
          path.join('apps', 'backend', 'packmind.json'),
          path.join('apps', 'frontend', 'packmind.json'),
        ].sort(),
      );
    });
  });

  describe('when --path is given and upgrades are available', () => {
    it('suggests the upgrade on the same path', async () => {
      writeConfig(rootDir);
      mockCheckUpgrades.mockResolvedValue(upgradableResult);

      await run('apps/frontend');

      expect(output.at(-1)).toBe(
        `Run ${EXEC_NAME} install --upgrade -p apps/frontend to apply these changes.`,
      );
    });
  });

  describe('when the check fails', () => {
    beforeEach(async () => {
      writeConfig(rootDir);
      mockCheckUpgrades.mockRejectedValue(
        new PackmindConfigInvalidError(rootDir),
      );
      await run();
    });

    it('prints the error', () => {
      expect(errors).toEqual([
        expect.stringContaining('packmind.json could not be parsed'),
      ]);
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});

describe('findCheckUpgradesConflict', () => {
  describe('when combined with --upgrade', () => {
    it('explains the conflict', () => {
      expect(
        findCheckUpgradesConflict({
          packages: [],
          status: false,
          upgrade: true,
        }),
      ).toBe('--check-upgrades cannot be combined with --upgrade.');
    });
  });

  describe('when combined with --status', () => {
    it('explains the conflict', () => {
      expect(findCheckUpgradesConflict({ packages: [], status: true })).toBe(
        '--check-upgrades cannot be combined with --status.',
      );
    });
  });

  describe('when package names are given', () => {
    it('explains that it takes none', () => {
      expect(
        findCheckUpgradesConflict({
          packages: [{ spaceSlug: 'space', packageSlug: 'pkg' }],
          status: false,
        }),
      ).toBe(
        '--check-upgrades checks the packages of packmind.json and takes no package names.',
      );
    });
  });

  describe('when used alone', () => {
    it('finds no conflict', () => {
      expect(
        findCheckUpgradesConflict({ packages: [], status: false }),
      ).toBeNull();
    });
  });
});
