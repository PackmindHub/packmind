import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  RunCliResult,
  readFile,
  runCli,
  updateFile,
  fileExists,
  UserSignedUpContext,
} from './helpers';
import { Package, PackmindLockFile } from '@packmind/types';
import fs from 'fs';
import path from 'path';

/**
 * Extract the running CLI's verbatim version string (e.g. `0.28.1-next`) by
 * invoking `--version`. Mirrors the helper used by `cli-version-drift.spec.ts`.
 */
async function detectRunningCliVersion(): Promise<string> {
  const result = await runCli('--version');
  const match = result.stdout.match(/version\s+(\S+)/);
  if (!match) {
    throw new Error(
      `[install] Could not parse CLI version from --version output: "${result.stdout}"`,
    );
  }
  return match[1];
}

describeForVersion('>= 0.24.0', 'install command', () => {
  describeWithUserSignedUp('install command', (getContext) => {
    let context: UserSignedUpContext;
    let pkg: Package;
    let installResult: RunCliResult;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      // Create a package with both commands
      const createPackageResponse = await context.gateway.packages.create({
        name: 'My package',
        description: 'Test package for diff command',
        recipeIds: [],
        standardIds: [],
        spaceId: context.space.id,
      });
      pkg = createPackageResponse.package;
    });

    describe('when user specifies the packages to install in the command line', () => {
      describe('when user does not specify the space slug', () => {
        beforeEach(async () => {
          installResult = await context.runCli(`install ${pkg.slug}`);
        });

        it('succeeds', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('references the space slug in the packmind.json file', () => {
          const packmindJson = readFile('packmind.json', context.testDir);

          expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
        });
      });

      describe('when user specifies the space slug', () => {
        beforeEach(async () => {
          installResult = await context.runCli(
            `install @${context.space.slug}/${pkg.slug}`,
          );
        });

        it('succeeds', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('references the space slug in the packmind.json file', () => {
          const packmindJson = readFile('packmind.json', context.testDir);

          expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
        });
      });
    });

    describe('when content to install is read from packmind.json', () => {
      describe('when packages are not prefixed by space slug', () => {
        beforeEach(async () => {
          updateFile(
            'packmind.json',
            JSON.stringify({ packages: { [pkg.slug]: '*' } }),
            context.testDir,
          );

          installResult = await context.runCli(`install`);
        });

        it('succeeds', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('updates the packmind.json file with a prefixed label of the package', () => {
          const packmindJson = readFile('packmind.json', context.testDir);

          expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
        });
      });
    });

    describe('when using --path to scope install to a subdirectory', () => {
      beforeEach(async () => {
        fs.mkdirSync(`${context.testDir}/apps/frontend`, { recursive: true });

        installResult = await context.runCli(
          `install ${pkg.slug} --path apps/frontend`,
        );
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('creates packmind.json in the target directory with normalized slug', () => {
        const packmindJson = readFile(
          'apps/frontend/packmind.json',
          context.testDir,
        );

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('does not create packmind.json at the root', () => {
        expect(fileExists('packmind.json', context.testDir)).toBe(false);
      });
    });

    describe('when installing recursively across multiple directories', () => {
      beforeEach(async () => {
        // Create packmind.json at root and in a subdirectory
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );
        fs.mkdirSync(`${context.testDir}/apps/sub`, { recursive: true });
        updateFile(
          'apps/sub/packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );

        installResult = await context.runCli(`install`);
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('normalizes slugs in root packmind.json', () => {
        const packmindJson = readFile('packmind.json', context.testDir);

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('normalizes slugs in subdirectory packmind.json', () => {
        const packmindJson = readFile(
          'apps/sub/packmind.json',
          context.testDir,
        );

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });
    });

    describe('when comparing scoped and unscoped slugs', () => {
      let unscopedResult: RunCliResult;
      let scopedResult: RunCliResult;

      beforeEach(async () => {
        fs.mkdirSync(`${context.testDir}/dir-unscoped`, { recursive: true });
        fs.mkdirSync(`${context.testDir}/dir-scoped`, { recursive: true });

        unscopedResult = await context.runCli(
          `install ${pkg.slug} --path dir-unscoped`,
        );
        scopedResult = await context.runCli(
          `install @${context.space.slug}/${pkg.slug} --path dir-scoped`,
        );
      });

      it('succeeds with unscoped slug', () => {
        expect(unscopedResult.returnCode).toBe(0);
      });

      it('succeeds with scoped slug', () => {
        expect(scopedResult.returnCode).toBe(0);
      });

      it('normalizes the unscoped slug in packmind.json', () => {
        const unscopedJson = readFile(
          'dir-unscoped/packmind.json',
          context.testDir,
        );

        expect(unscopedJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('keeps the scoped slug in packmind.json', () => {
        const scopedJson = readFile(
          'dir-scoped/packmind.json',
          context.testDir,
        );

        expect(scopedJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });
    });

    // The fresh-install summary fix landed after 0.28.1. Gate this block so
    // the production-CLI run (CI installs the published @packmind/cli) skips
    // versions that still emit the old "Nothing to install" message.
    describeForVersion(
      '> 0.28.1',
      'when packmind.json does not exist (fresh install)',
      () => {
        let pkgWithSkills: Package;

        beforeEach(async () => {
          // Create a package containing at least one skill so the capability
          // warning fires when only AGENTS.md / packmind agents are configured.
          // The e2e gateway currently does not expose a helper to attach skills
          // to a test package, so the package is created empty for now and the
          // skill-capability assertion below stays skipped.
          const created = await context.gateway.packages.create({
            name: 'Skills test package',
            description: 'Has skills only',
            recipeIds: [],
            standardIds: [],
            spaceId: context.space.id,
          });
          pkgWithSkills = created.package;
        });

        describe('and the user runs install <package>', () => {
          let result: RunCliResult;

          beforeEach(async () => {
            // Confirm packmind.json does not exist yet
            expect(fileExists('packmind.json', context.testDir)).toBe(false);

            result = await context.runCli(
              `install @${context.space.slug}/${pkgWithSkills.slug}`,
            );
          });

          it('exits successfully', () => {
            expect(result.returnCode).toBe(0);
          });

          it('creates packmind.json with the package', () => {
            expect(fileExists('packmind.json', context.testDir)).toBe(true);
            const content = readFile('packmind.json', context.testDir);
            expect(content).toContain(pkgWithSkills.slug);
          });

          it('reports that packmind.json was created in stdout', () => {
            expect(result.stdout).toContain('Created packmind.json');
          });

          it('never emits the bare "Nothing to install" message', () => {
            expect(result.stdout).not.toContain('Nothing to install');
          });

          // TODO: enable once the e2e gateway can publish skills into a test
          // package. With AGENTS.md/packmind as default agents, the CLI should
          // print the capability warning naming "skills".
          it.skip('warns when configured agents lack skill capability', () => {
            expect(result.stdout).toContain('could not be rendered');
            expect(result.stdout).toContain('skills');
            expect(result.stdout).toContain('packmind-cli config agents');
          });
        });
      },
    );

    // Drift detection landed after 0.28.1; gate so production-CLI CI skips
    // older CLI versions that do not implement the new behaviour.
    describeForVersion(
      '> 0.28.1',
      'when running install at git root under CLI version drift',
      () => {
        let runningCliVersion: string;

        beforeAll(async () => {
          runningCliVersion = await detectRunningCliVersion();
        });

        describe('and the lockfile records an older CLI version with an obsolete skill', () => {
          const obsoleteSkillPath =
            '.claude/skills/fake-obsolete-skill/SKILL.md';
          let result: RunCliResult;

          beforeEach(async () => {
            // Hand-crafted v1 lockfile (pre-`source`-field schema). Cast
            // through `unknown` because the current `PackmindLockFile` type
            // mandates `source` on every entry — the on-disk JSON intentionally
            // omits it so the CLI's silent v1→v2 migration is exercised.
            const lockFile: PackmindLockFile = {
              lockfileVersion: 1,
              cliVersion: '0.0.1',
              packageSlugs: [],
              agents: [],
              artifacts: {
                'fake-obsolete-skill': {
                  name: 'fake-obsolete-skill',
                  type: 'skill',
                  id: 'artifact-skill-obsolete',
                  version: 1,
                  spaceId: 'space-e2e-drift',
                  packageIds: [],
                  files: [
                    {
                      path: obsoleteSkillPath,
                      agent: 'claude',
                      isSkillDefinition: true,
                    },
                  ],
                },
              },
            } as unknown as PackmindLockFile;
            updateFile(
              'packmind-lock.json',
              JSON.stringify(lockFile, null, 2) + '\n',
              context.testDir,
            );
            // Seed the obsolete skill file on disk so we can assert it gets
            // deleted by the silent cleanup.
            const absolutePath = path.join(context.testDir, obsoleteSkillPath);
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(
              absolutePath,
              '---\nname: fake-obsolete-skill\ndescription: legacy\n---\nLegacy\n',
              'utf-8',
            );

            result = await context.runCli('install');
          });

          it('exits successfully', () => {
            expect(result.returnCode).toBe(0);
          });

          it('removes the obsolete skill silently', () => {
            expect(fileExists(obsoleteSkillPath, context.testDir)).toBe(false);
            expect(result.stdout).not.toMatch(/Are you sure/i);
          });
        });

        describe('and the lockfile records a newer CLI version', () => {
          let result: RunCliResult;

          beforeEach(async () => {
            const lockFile: PackmindLockFile = {
              lockfileVersion: 1,
              cliVersion: '99.0.0',
              packageSlugs: [],
              agents: [],
              artifacts: {},
            };
            updateFile(
              'packmind-lock.json',
              JSON.stringify(lockFile, null, 2) + '\n',
              context.testDir,
            );

            result = await context.runCli('install');
          });

          it('exits successfully', () => {
            expect(result.returnCode).toBe(0);
          });

          it('prints the older-version warning', () => {
            expect(result.stderr).toContain(
              'older than the version recorded in packmind-lock.json',
            );
          });

          it('does not rewrite the lockfile cliVersion', () => {
            const lockFileContent = readFile(
              'packmind-lock.json',
              context.testDir,
            );
            const lockFile = JSON.parse(lockFileContent) as PackmindLockFile;
            expect(lockFile.cliVersion).toBe('99.0.0');
          });
        });

        describe('and the lockfile records the running CLI version', () => {
          let result: RunCliResult;

          beforeEach(async () => {
            const lockFile: PackmindLockFile = {
              lockfileVersion: 1,
              cliVersion: runningCliVersion,
              packageSlugs: [],
              agents: [],
              artifacts: {},
            };
            updateFile(
              'packmind-lock.json',
              JSON.stringify(lockFile, null, 2) + '\n',
              context.testDir,
            );

            result = await context.runCli('install');
          });

          it('exits successfully', () => {
            expect(result.returnCode).toBe(0);
          });

          it('does not print drift output', () => {
            const combined = result.stdout + result.stderr;
            expect(combined).not.toContain(
              'older than the version recorded in packmind-lock.json',
            );
            expect(combined).not.toContain('CLI upgrade detected');
          });
        });
      },
    );

    describe('when using --path to scope recursive install to a subtree', () => {
      beforeEach(async () => {
        // Create packmind.json at root and in a subdirectory
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );
        fs.mkdirSync(`${context.testDir}/apps/backend`, { recursive: true });
        updateFile(
          'apps/backend/packmind.json',
          JSON.stringify({ packages: { [pkg.slug]: '*' } }),
          context.testDir,
        );

        installResult = await context.runCli(`install --path apps/backend`);
      });

      it('succeeds', () => {
        expect(installResult.returnCode).toBe(0);
      });

      it('normalizes slugs in the target subdirectory', () => {
        const packmindJson = readFile(
          'apps/backend/packmind.json',
          context.testDir,
        );

        expect(packmindJson).toContain(`@${context.space.slug}/${pkg.slug}`);
      });

      it('does not normalize the root packmind.json', () => {
        const packmindJson = readFile('packmind.json', context.testDir);

        expect(packmindJson).not.toContain(
          `@${context.space.slug}/${pkg.slug}`,
        );
      });

      it('preserves the original slug in the root packmind.json', () => {
        const packmindJson = readFile('packmind.json', context.testDir);

        expect(packmindJson).toContain(pkg.slug);
      });
    });

    // Default-skill lockfile tracking landed after 0.28.1. Gate so the
    // production-CLI run (CI installs the published @packmind/cli) skips
    // CLI versions that do not yet emit `default:skill:...` entries.
    describeForVersion(
      '> 0.28.1',
      'default-skill lockfile tracking on install at git root',
      () => {
        let pkgWithStandard: Package;
        let createdStandardSlug: string;

        beforeEach(async () => {
          // Seed a user-authored standard so the package install produces a
          // `user:standard:...` lockfile entry alongside the default skills.
          const standardResponse = await context.gateway.standards.create({
            description: 'A standard for lockfile assertions',
            name: 'My E2E standard',
            rules: [],
            scope: '',
            spaceId: context.space.id,
          });
          createdStandardSlug = standardResponse.standard.slug;

          const packageResponse = await context.gateway.packages.create({
            name: 'Pkg with standard',
            description: 'Standards-bearing package',
            recipeIds: [],
            standardIds: [standardResponse.standard.id],
            spaceId: context.space.id,
          });
          pkgWithStandard = packageResponse.package;
        });

        describe('and the user runs install <package> at the git root', () => {
          let result: RunCliResult;
          let lockFile: PackmindLockFile;

          beforeEach(async () => {
            // Fresh test users default to coding agents ['packmind', 'agents_md']
            // — neither has a default-skill deployer. Override via packmind.json
            // so the claude default-skill deployers run alongside the package
            // install and produce default:skill:<slug> lockfile entries.
            updateFile(
              'packmind.json',
              JSON.stringify({ packages: {}, agents: ['claude'] }),
              context.testDir,
            );
            result = await context.runCli(
              `install @${context.space.slug}/${pkgWithStandard.slug}`,
            );
            const raw = readFile('packmind-lock.json', context.testDir);
            lockFile = JSON.parse(raw) as PackmindLockFile;
          });

          it('exits successfully', () => {
            expect(result.returnCode).toBe(0);
          });

          it('writes a lockfileVersion: 2 lockfile', () => {
            expect(lockFile.lockfileVersion).toBe(2);
          });

          it('records the user standard under a user:standard:<slug> key', () => {
            expect(
              lockFile.artifacts[`user:standard:${createdStandardSlug}`],
            ).toBeDefined();
          });

          it('tags the user standard entry with source: "user"', () => {
            expect(
              lockFile.artifacts[`user:standard:${createdStandardSlug}`].source,
            ).toBe('user');
          });

          it('records every default skill under a default:skill:<slug> key', () => {
            const defaultKeys = Object.keys(lockFile.artifacts).filter((k) =>
              k.startsWith('default:skill:'),
            );
            expect(defaultKeys.length).toBeGreaterThan(0);
          });

          it('tags every default-skill entry with source: "default"', () => {
            const defaultEntries = Object.entries(lockFile.artifacts)
              .filter(([k]) => k.startsWith('default:skill:'))
              .map(([, entry]) => entry);
            expect(defaultEntries.length).toBeGreaterThan(0);
            for (const entry of defaultEntries) {
              expect(entry.source).toBe('default');
            }
          });

          it('records the well-known packmind-create-skill default entry', () => {
            expect(
              lockFile.artifacts['default:skill:packmind-create-skill'],
            ).toBeDefined();
            expect(
              lockFile.artifacts['default:skill:packmind-create-skill'].source,
            ).toBe('default');
          });
        });
      },
    );

    // v1 → v2 migration landed after 0.28.1.
    describeForVersion(
      '> 0.28.1',
      'v1 → v2 lockfile migration on skills init',
      () => {
        let userSkillSlug: string;

        beforeEach(async () => {
          // Pre-seed a hand-crafted v1 lockfile with a user-skill entry keyed
          // by the legacy `${type}:${slug}` format. After `skills init`, the
          // entry must be re-keyed to `user:${type}:${slug}` and tagged
          // source:'user'. We test against `skills init` (not `install <pkg>`)
          // because the package install path rebuilds the lockfile from the
          // server's response, which loses pre-existing entries (a separate
          // pre-existing limitation tracked in the implementation-plan's
          // Known Issues section).
          userSkillSlug = 'legacy-user-skill';
          const v1LockFile = {
            lockfileVersion: 1,
            cliVersion: '0.0.1',
            packageSlugs: [],
            agents: [],
            artifacts: {
              [`skill:${userSkillSlug}`]: {
                name: 'legacy-user-skill',
                type: 'skill',
                id: 'artifact-legacy-user-skill',
                version: 1,
                spaceId: 'space-e2e-migration',
                packageIds: [],
                files: [
                  {
                    path: `.claude/skills/${userSkillSlug}/SKILL.md`,
                    agent: 'claude',
                    isSkillDefinition: true,
                  },
                ],
              },
            },
          };
          updateFile(
            'packmind-lock.json',
            JSON.stringify(v1LockFile, null, 2) + '\n',
            context.testDir,
          );
        });

        describe('after running skills init at the git root', () => {
          let result: RunCliResult;
          let lockFile: PackmindLockFile;

          beforeEach(async () => {
            // Fresh test users default to coding agents ['packmind', 'agents_md']
            // — neither has a default-skill deployer. Override via packmind.json
            // so the claude default-skill deployers run and produce
            // default:skill:<slug> entries in the merged lockfile.
            updateFile(
              'packmind.json',
              JSON.stringify({ packages: {}, agents: ['claude'] }),
              context.testDir,
            );
            result = await context.runCli('skills init');
            const raw = readFile('packmind-lock.json', context.testDir);
            lockFile = JSON.parse(raw) as PackmindLockFile;
          });

          it('exits successfully', () => {
            expect(result.returnCode).toBe(0);
          });

          it('bumps lockfileVersion to 2', () => {
            expect(lockFile.lockfileVersion).toBe(2);
          });

          it('re-keys the legacy user-skill entry under the user: prefix', () => {
            expect(
              lockFile.artifacts[`user:skill:${userSkillSlug}`],
            ).toBeDefined();
          });

          it('tags the migrated user-skill entry with source: "user"', () => {
            expect(
              lockFile.artifacts[`user:skill:${userSkillSlug}`].source,
            ).toBe('user');
          });

          it('drops the legacy `${type}:${slug}` key', () => {
            expect(
              lockFile.artifacts[`skill:${userSkillSlug}`],
            ).toBeUndefined();
          });

          it('adds default-skill entries tagged source: "default"', () => {
            const defaultEntries = Object.entries(lockFile.artifacts)
              .filter(([k]) => k.startsWith('default:skill:'))
              .map(([, entry]) => entry);
            expect(defaultEntries.length).toBeGreaterThan(0);
            for (const entry of defaultEntries) {
              expect(entry.source).toBe('default');
            }
          });
        });
      },
    );
  });
});
