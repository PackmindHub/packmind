import path from 'path';
import fs from 'fs';
import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  runCli,
  readFile,
  updateFile,
  fileExists,
  UserSignedUpContext,
  RunCliResult,
} from './helpers';
import { PackmindLockFile } from '@packmind/types';

/**
 * Extract the running CLI's verbatim version string (e.g. `0.28.1-next`) by
 * invoking `--version` against the same binary `runCli` uses. Works in both
 * dev mode (`dist/apps/cli/main.cjs`) and production mode (`CLI_BINARY_PATH`).
 */
async function detectRunningCliVersion(): Promise<string> {
  const result = await runCli('--version');
  const match = result.stdout.match(/version\s+(\S+)/);
  if (!match) {
    throw new Error(
      `[cli-version-drift] Could not parse CLI version from --version output: "${result.stdout}"`,
    );
  }
  return match[1];
}

function buildLockFileWithObsoleteSkill(
  cliVersion: string,
  obsoleteSkillFilePath: string,
): PackmindLockFile {
  return {
    lockfileVersion: 1,
    cliVersion,
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
            path: obsoleteSkillFilePath,
            agent: 'claude',
            isSkillDefinition: true,
          },
        ],
      },
    },
  };
}

function seedObsoleteSkillFile(testDir: string, relativePath: string): void {
  const absolutePath = path.join(testDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(
    absolutePath,
    '---\nname: fake-obsolete-skill\ndescription: legacy skill\n---\nLegacy content\n',
    'utf-8',
  );
}

// Drift detection landed after 0.28.1; gate so production-CLI CI skips older
// CLI versions that do not implement the new behaviour.
describeForVersion('> 0.28.1', 'CLI version drift (skills init)', () => {
  describeWithUserSignedUp(
    'skills init under CLI version drift',
    (getContext) => {
      let context: UserSignedUpContext;
      let runningCliVersion: string;

      beforeAll(async () => {
        runningCliVersion = await detectRunningCliVersion();
      });

      beforeEach(async () => {
        context = await getContext();
        await setupGitRepo(context.testDir);
      });

      describe('when the lockfile records an older CLI version and a skill file unknown to the deployer', () => {
        const skillPath = '.claude/skills/fake-obsolete-skill/SKILL.md';
        let result: RunCliResult;

        beforeEach(async () => {
          updateFile(
            'packmind-lock.json',
            JSON.stringify(
              buildLockFileWithObsoleteSkill('0.0.1', skillPath),
              null,
              2,
            ) + '\n',
            context.testDir,
          );
          seedObsoleteSkillFile(context.testDir, skillPath);

          result = await context.runCli('skills init');
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('rewrites the lockfile with the running CLI version', () => {
          const lockFileContent = readFile(
            'packmind-lock.json',
            context.testDir,
          );
          const lockFile = JSON.parse(lockFileContent) as PackmindLockFile;
          expect(lockFile.cliVersion).toBe(runningCliVersion);
        });

        // Anti-regression: the CLI must never delete a skill file purely
        // because it is listed in the lockfile but not in the deployer's
        // current default-skill set. That heuristic would also destroy
        // user-authored skills, so the previous implementation was reverted.
        it('does not remove the on-disk skill file', () => {
          expect(fileExists(skillPath, context.testDir)).toBe(true);
          expect(
            fileExists('.claude/skills/fake-obsolete-skill', context.testDir),
          ).toBe(true);
        });

        it('does not prompt the user before any cleanup', () => {
          const combined = result.stdout + result.stderr;
          expect(combined).not.toMatch(/Are you sure/i);
          expect(combined).not.toMatch(/\(y\/n\)/i);
        });
      });

      describe('when the lockfile records a newer CLI version', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          updateFile(
            'packmind-lock.json',
            JSON.stringify(
              {
                lockfileVersion: 1,
                cliVersion: '99.0.0',
                packageSlugs: [],
                agents: [],
                artifacts: {},
              } satisfies PackmindLockFile,
              null,
              2,
            ) + '\n',
            context.testDir,
          );

          result = await context.runCli('skills init');
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('prints the "older than packmind-lock.json" warning', () => {
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

      describe('when the lockfile records the running CLI version', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          updateFile(
            'packmind-lock.json',
            JSON.stringify(
              {
                lockfileVersion: 1,
                cliVersion: runningCliVersion,
                packageSlugs: [],
                agents: [],
                artifacts: {},
              } satisfies PackmindLockFile,
              null,
              2,
            ) + '\n',
            context.testDir,
          );

          result = await context.runCli('skills init');
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('does not print the older-version warning', () => {
          const combined = result.stdout + result.stderr;
          expect(combined).not.toContain(
            'older than the version recorded in packmind-lock.json',
          );
        });

        it('does not print the upgrade-detected line', () => {
          const combined = result.stdout + result.stderr;
          expect(combined).not.toContain('CLI upgrade detected');
        });
      });
    },
  );
});
