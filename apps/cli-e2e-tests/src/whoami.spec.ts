import {
  describeWithUserSignedUp,
  runCli,
  UserSignedUpContext,
  getPackmindInstanceUrl,
} from './helpers';

import { describeWithTempSpace } from './helpers/describeWithTempSpace';

describe('whoami command', () => {
  describeWithUserSignedUp('when user is signed in', (getContext) => {
    let returnCode: number;
    let stdout: string;
    let context: UserSignedUpContext;

    beforeEach(async () => {
      context = await getContext();
      const result = await runCli('whoami', {
        apiKey: context.apiKey,
        cwd: context.testDir,
      });

      returnCode = result.returnCode;
      stdout = result.stdout;
    });

    it('succeeds', () => {
      expect(returnCode).toEqual(0);
    });

    it('shows authenticated status', () => {
      expect(stdout).toContain('Authenticated');
    });

    it('shows user and host information', () => {
      expect(stdout.split('\n')).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`Host: ${getPackmindInstanceUrl()}`),
          expect.stringContaining(`Organization: ${context.organization.name}`),
          expect.stringContaining(`User: ${context.user.email}`),
        ]),
      );
    });
  });

  describeWithTempSpace('when user is not signed in', (getContext) => {
    let testDir: string;
    let returnCode: number;
    let stdout: string;

    beforeEach(async () => {
      const context = await getContext();
      testDir = context.testDir;

      const result = await runCli('whoami', { cwd: testDir }); // No API key

      returnCode = result.returnCode;
      stdout = result.stdout;
    });

    it('fails', () => {
      expect(returnCode).toEqual(1);
    });

    it('shows not authenticated status', () => {
      expect(stdout).toContain('No credentials found');
    });
  });
});
