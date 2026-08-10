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

const randomEmail = (): string => `track-e2e-${uuidv4()}@example.com`;

describeForVersion('> 0.31.0', 'track command', () => {
  describeWithUserSignedUp(
    'when tracking the current repository',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        result = await context.runCli('track');
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
        await context.runCli('track');
        result = await context.runCli('track');
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
        await context.runCli('track');
        execSync('git checkout -b dev', { cwd: context.testDir });
        result = await context.runCli('track');
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
        await context.runCli('track');
        execSync('git checkout -b dev', { cwd: context.testDir });
        result = await context.runCli('track --update');
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
        result = await runCli('track', {
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

// `untrack` ships after 0.32.0, so gate these above the current release: in
// production mode the released binary has no such command and cmd-ts would
// reject it as an unknown argument.
describeForVersion('> 0.32.0', 'untrack', () => {
  describeWithUserSignedUp(
    'when removing tracking for a tracked repository',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli('track');
        result = await context.runCli('untrack');
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
        await context.runCli('track');
        await context.runCli('untrack');
        result = await context.runCli('untrack');
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
        await context.runCli('track');
        await context.runCli('untrack');
        result = await context.runCli('track');
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
        result = await context.runCli('untrack');
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
