import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  describeForVersion,
  describeWithExtraUser,
  describeWithUserSignedUp,
  runCli,
  setupGitRepo,
  WithMemberContext,
} from './helpers';
import { matchesVersionConstraint } from './helpers/cliVersion';
import { describeWithTempSpace } from './helpers/describeWithTempSpace';

const randomEmail = (): string => `track-e2e-${uuidv4()}@example.com`;
describeForVersion('> 0.31.0', 'track command', () => {
  const trackCommand = matchesVersionConstraint('>0.33.0')
    ? 'git track'
    : 'track';

  describeWithUserSignedUp(
    'when tracking the current repository',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        result = await context.runCli(trackCommand);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('confirms the tracked repository and branch', () => {
        expect(result.stdout).toContain(
          'Packmind now tracks PackmindHub/sample-repo on branch main',
        );
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when tracking the same branch a second time',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        result = await context.runCli(trackCommand);
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the branch is already tracked', () => {
        expect(result.stdout).toContain('already tracked on branch main');
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when tracking a different branch without --update',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        execSync('git checkout -b dev', { cwd: context.testDir });
        result = await context.runCli(trackCommand);
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('reports the repository is already tracked on the other branch', () => {
        expect(result.stderr).toContain('already tracked on branch main');
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when moving the tracked branch with --update',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        execSync('git checkout -b dev', { cwd: context.testDir });
        result = await context.runCli(`${trackCommand} --update`);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('confirms the tracked branch moved from main to dev', () => {
        expect(result.stdout).toContain(
          'Tracked branch for PackmindHub/sample-repo changed from main to dev',
        );
      });
    },
    { email: randomEmail },
  );

  describeWithExtraUser(
    'when a non-admin member tracks the repository',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context: WithMemberContext = await getContext();
        await setupGitRepo(context.testDir);
        result = await runCli(trackCommand, {
          apiKey: context.extraUserApiKey,
          cwd: context.testDir,
        });
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });
    },
    { email: `track-member-${uuidv4()}@example.com`, role: 'member' },
  );
});

// `--branch` ships after 0.32.0; the released binary rejects it as an unknown
// argument, so this is gated above the current release.
describeForVersion('> 0.32.0', 'track --branch', () => {
  const trackCommand = matchesVersionConstraint('>0.33.0')
    ? 'git track'
    : 'track';

  describeWithUserSignedUp(
    'when tracking a branch other than the checked-out one',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        execSync('git checkout -b dev', { cwd: context.testDir });
        result = await context.runCli(`${trackCommand} --branch main`);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      // Previously this required `git checkout main` first.
      it('tracks the requested branch, not the checked-out one', () => {
        expect(result.stdout).toContain(
          'Packmind now tracks PackmindHub/sample-repo on branch main',
        );
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when moving tracking to a branch that is not checked out',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        // Created but never checked out: `--branch` does not require it.
        execSync('git branch dev', { cwd: context.testDir });
        result = await context.runCli(`${trackCommand} --update --branch dev`);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('moves tracking to the requested branch', () => {
        expect(result.stdout).toContain(
          'Tracked branch for PackmindHub/sample-repo changed from main to dev',
        );
      });
    },
    { email: randomEmail },
  );
});

// Branch validation ships after 0.33.0: the released binary tracks a
// misspelled branch without complaining, so gate this above the current release.
describeForVersion('> 0.33.0', 'track --branch validation', () => {
  describeWithUserSignedUp(
    'when the requested branch does not exist',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;
      let info: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        result = await context.runCli('git track --branch mian');
        info = await context.runCli('git info');
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('reports that the branch does not exist', () => {
        expect(result.stderr).toContain(
          'Branch mian does not exist in PackmindHub/sample-repo',
        );
      });

      // The typo used to be tracked silently, and only showed up later as
      // distributions that were never recorded.
      it('leaves the repository untracked', () => {
        expect(info.stdout).toContain(
          'PackmindHub/sample-repo is not tracked in Packmind',
        );
      });
    },
    { email: randomEmail },
  );
});

// `untrack` ships after 0.32.0, so gate these above the current release: in
// production mode the released binary has no such command and cmd-ts would
// reject it as an unknown argument.
describeForVersion('> 0.32.0', 'untrack', () => {
  const trackCommand = matchesVersionConstraint('>0.33.0')
    ? 'git track'
    : 'track';
  const untrackCommand = matchesVersionConstraint('>0.33.0')
    ? 'git untrack'
    : 'untrack';

  describeWithUserSignedUp(
    'when removing tracking for a tracked repository',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        result = await context.runCli(untrackCommand);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('confirms the tracking is gone', () => {
        expect(result.stdout).toContain(
          'Packmind no longer tracks PackmindHub/sample-repo',
        );
      });

      it('promises the recorded distributions are kept', () => {
        expect(result.stdout).toContain('are kept');
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when removing tracking a second time',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        await context.runCli(untrackCommand);
        result = await context.runCli(untrackCommand);
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('warns that the repository is not tracked', () => {
        expect(result.stdout + result.stderr).toContain('is not tracked in');
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when tracking is set again after being removed',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli(trackCommand);
        await context.runCli(untrackCommand);
        result = await context.runCli(trackCommand);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('tracks the same branch again', () => {
        expect(result.stdout).toContain(
          'Packmind now tracks PackmindHub/sample-repo on branch main',
        );
      });
    },
    { email: randomEmail },
  );

  // The unknown-repository error is mapped to 409 on purpose: the CLI reads any
  // 404 on the tracking routes as "tracking is not available for your account",
  // which would be a misleading thing to print here.
  describeWithUserSignedUp(
    'when removing tracking for a repository Packmind has never seen',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        result = await context.runCli(untrackCommand);
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('names the repository that is not connected', () => {
        expect(result.stderr + result.stdout).toContain(
          'is not connected to Packmind',
        );
      });

      it('does not blame the account for a missing feature', () => {
        expect(result.stderr + result.stdout).not.toContain(
          'not available for your account',
        );
      });
    },
    { email: randomEmail },
  );
});

// The stubs only exist after the rename; before it, these were the real
// commands. They never reach the API, so no signed-up user is needed.
describeForVersion('> 0.33.0', 'removed track and untrack commands', () => {
  describeWithTempSpace(
    'when the removed track command is run',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const { testDir } = await getContext();
        result = await runCli('track', { cwd: testDir });
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('says the command has been removed', () => {
        expect(result.stdout + result.stderr).toContain(
          'Command "packmind track" has been removed.',
        );
      });

      it('names the command that replaces it', () => {
        expect(result.stdout + result.stderr).toContain('packmind git track');
      });
    },
  );

  describeWithTempSpace(
    'when the removed track command is run with flags',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const { testDir } = await getContext();
        result = await runCli('track --update --branch main', { cwd: testDir });
      });

      it('carries the flags over to the suggested command', () => {
        expect(result.stdout + result.stderr).toContain(
          'packmind git track --update --branch main',
        );
      });
    },
  );

  // `--remove` predates the `untrack` command. It used to fail with a raw
  // cmd-ts "unknown arguments" error that never mentioned the replacement.
  describeWithTempSpace(
    'when the removed track --remove flag is used',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const { testDir } = await getContext();
        result = await runCli('track --remove', { cwd: testDir });
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('does not fail on argument parsing', () => {
        expect(result.stdout + result.stderr).not.toContain(
          'Unknown arguments',
        );
      });

      it('names the command that replaces it', () => {
        expect(result.stdout + result.stderr).toContain('packmind git untrack');
      });
    },
  );

  describeWithTempSpace(
    'when the removed untrack command is run',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const { testDir } = await getContext();
        result = await runCli('untrack', { cwd: testDir });
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('names the command that replaces it', () => {
        expect(result.stdout + result.stderr).toContain('packmind git untrack');
      });
    },
  );
});
