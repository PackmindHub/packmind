import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  RunCliResult,
  UserSignedUpContext,
  updateFile,
  readFile,
  fileExists,
} from './helpers';
import { PackmindLockFile } from '@packmind/types';

describeForVersion('>= 0.24.0', 'skills init command', () => {
  describeWithUserSignedUp('skills init command', (getContext) => {
    describe('when configured agents include a skill-capable agent', () => {
      let context: UserSignedUpContext;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        await setupGitRepo(context.testDir);
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: {}, agents: ['claude'] }),
          context.testDir,
        );

        result = await context.runCli('skills init');
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('displays a success message', () => {
        expect(result.stdout).toMatch(
          /Default skills installed successfully|Default skills are already up to date/,
        );
      });

      it('does not output any error', () => {
        expect(result.stdout).not.toContain('Installation failed');
      });

      // Default-skill lockfile tracking landed after 0.28.1.
      describeForVersion(
        '> 0.28.1',
        'lockfile entries for default skills',
        () => {
          let lockFile: PackmindLockFile;

          beforeEach(() => {
            // Sanity: previous beforeEach already ran `skills init`.
            expect(fileExists('packmind-lock.json', context.testDir)).toBe(
              true,
            );
            const raw = readFile('packmind-lock.json', context.testDir);
            lockFile = JSON.parse(raw) as PackmindLockFile;
          });

          it('writes a lockfileVersion: 2 lockfile', () => {
            expect(lockFile.lockfileVersion).toBe(2);
          });

          it('records at least one default:skill:<slug> entry', () => {
            const defaultKeys = Object.keys(lockFile.artifacts).filter((k) =>
              k.startsWith('default:skill:'),
            );
            expect(defaultKeys.length).toBeGreaterThan(0);
          });

          it('records only default:skill:<slug> entries (no user: prefix)', () => {
            const allKeys = Object.keys(lockFile.artifacts);
            for (const key of allKeys) {
              expect(key.startsWith('default:skill:')).toBe(true);
            }
          });

          it('tags every entry with source: "default"', () => {
            const entries = Object.values(lockFile.artifacts);
            expect(entries.length).toBeGreaterThan(0);
            for (const entry of entries) {
              expect(entry.source).toBe('default');
            }
          });
        },
      );
    });

    describeForVersion(
      '> 0.28.1',
      'when no configured agent supports skills',
      () => {
        let context: UserSignedUpContext;
        let result: RunCliResult;

        beforeEach(async () => {
          context = await getContext();
          await setupGitRepo(context.testDir);
          updateFile(
            'packmind.json',
            JSON.stringify({ packages: {}, agents: ['agents_md'] }),
            context.testDir,
          );

          result = await context.runCli('skills init');
        });

        it('succeeds', () => {
          expect(result.returnCode).toBe(0);
        });

        it('warns that skills are skipped', () => {
          expect(result.stderr).toMatch(
            /Skipping default skills.*do not support skills/,
          );
        });

        it('does not display the misleading "already up to date" message', () => {
          expect(result.stdout).not.toContain(
            'Default skills are already up to date',
          );
        });
      },
    );
  });

  // Empty-directory bootstrap landed after 0.28.1.
  describeForVersion('> 0.28.1', 'skills init in empty directory', () => {
    describeWithUserSignedUp('skills init in empty directory', (getContext) => {
      let context: UserSignedUpContext;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        await setupGitRepo(context.testDir);

        // Do NOT seed packmind.json or packmind-lock.json — the bootstrap
        // step should detect the empty directory and write packmind.json
        // from the org's server-side render modes.
        result = await context.runCli('skills init');
      });

      it('exits with code 0', () => {
        expect(result.returnCode).toBe(0);
      });

      it('creates a packmind.json at the project root', () => {
        expect(fileExists('packmind.json', context.testDir)).toBe(true);
      });

      it('writes the org default agents (packmind, agents_md)', () => {
        const raw = readFile('packmind.json', context.testDir);
        const config = JSON.parse(raw) as { agents?: unknown };
        expect(config.agents).toEqual(['packmind', 'agents_md']);
      });
    });
  });
});
