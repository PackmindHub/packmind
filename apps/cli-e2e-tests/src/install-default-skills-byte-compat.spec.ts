import fs from 'fs';
import path from 'path';
import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  RunCliResult,
  UserSignedUpContext,
  readFile,
} from './helpers';
import { PackmindLockFile, PackmindLockFileEntry } from '@packmind/types';

/**
 * Extract default-skill entries (those keyed `default:skill:<slug>`) from a
 * parsed lockfile, sorted by key for deterministic comparison.
 */
function extractDefaultSkillEntries(
  lockFile: PackmindLockFile,
): Record<string, PackmindLockFileEntry> {
  const out: Record<string, PackmindLockFileEntry> = {};
  for (const key of Object.keys(lockFile.artifacts).sort()) {
    if (key.startsWith('default:skill:')) {
      out[key] = lockFile.artifacts[key];
    }
  }
  return out;
}

// Byte-compatibility is guaranteed by having the server emit a single
// lockFileSlice consumed by both install paths. This landed after 0.28.1.
describeForVersion(
  '> 0.28.1',
  'default-skill lockfile entries are byte-compatible across install paths',
  () => {
    describeWithUserSignedUp(
      'default-skill byte-compat across install paths',
      (getContext) => {
        let context: UserSignedUpContext;
        let installLockFile: PackmindLockFile;
        let skillsInitLockFile: PackmindLockFile;
        let installResult: RunCliResult;
        let skillsInitResult: RunCliResult;

        beforeEach(async () => {
          context = await getContext();
          await setupGitRepo(context.testDir);

          // Path A: install at git root (no package args — triggers the
          // default-skills install at git root via the bare `install` command).
          // We seed a packmind.json so the install command has something to do
          // beyond the empty no-op case, but the default-skills install is the
          // only behaviour we assert on here. `agents: ['claude']` overrides
          // the org default (['packmind', 'agents_md']) so the claude
          // default-skill deployers actually run.
          fs.writeFileSync(
            path.join(context.testDir, 'packmind.json'),
            JSON.stringify({ packages: {}, agents: ['claude'] }),
            'utf-8',
          );
          installResult = await context.runCli('install');
          const installRaw = readFile('packmind-lock.json', context.testDir);
          installLockFile = JSON.parse(installRaw) as PackmindLockFile;

          // Re-seed packmind.json with claude agents for Path B too — without
          // it the bare `skills init` would fall back to the org-level defaults
          // (no claude → no deployers → empty lockFileSlice).
          fs.writeFileSync(
            path.join(context.testDir, 'packmind.json'),
            JSON.stringify({ packages: {}, agents: ['claude'] }),
            'utf-8',
          );

          // Path B: skills init standalone.
          skillsInitResult = await context.runCli('skills init');
          const skillsRaw = readFile('packmind-lock.json', context.testDir);
          skillsInitLockFile = JSON.parse(skillsRaw) as PackmindLockFile;
        });

        it('install at git root exits successfully', () => {
          expect(installResult.returnCode).toBe(0);
        });

        it('skills init exits successfully', () => {
          expect(skillsInitResult.returnCode).toBe(0);
        });

        it('install path produces at least one default-skill entry', () => {
          const entries = extractDefaultSkillEntries(installLockFile);
          expect(Object.keys(entries).length).toBeGreaterThan(0);
        });

        it('skills init path produces at least one default-skill entry', () => {
          const entries = extractDefaultSkillEntries(skillsInitLockFile);
          expect(Object.keys(entries).length).toBeGreaterThan(0);
        });

        it('both paths produce the same set of default-skill keys', () => {
          const installKeys = Object.keys(
            extractDefaultSkillEntries(installLockFile),
          ).sort();
          const skillsKeys = Object.keys(
            extractDefaultSkillEntries(skillsInitLockFile),
          ).sort();
          expect(installKeys).toEqual(skillsKeys);
        });

        it('default-skill entries are byte-equal between install paths', () => {
          const installEntries = extractDefaultSkillEntries(installLockFile);
          const skillsEntries = extractDefaultSkillEntries(skillsInitLockFile);
          // `installedAt` is a top-level lockfile field, NOT per-entry; per-entry
          // payloads are emitted by the server's `lockFileSlice` and must be
          // byte-equal regardless of which CLI path triggered them.
          expect(JSON.stringify(installEntries)).toBe(
            JSON.stringify(skillsEntries),
          );
        });
      },
    );
  },
);
