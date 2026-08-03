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
