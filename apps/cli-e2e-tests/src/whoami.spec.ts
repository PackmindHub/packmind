import {
  describeWithUserSignedUp,
  describeForVersion,
  runCli,
  UserSignedUpContext,
  getPackmindInstanceUrl,
} from './helpers';

import { describeWithTempSpace } from './helpers/describeWithTempSpace';

describe('whoami command', () => {
  describeForVersion('>= 0.24.0', 'when user is signed in', () => {
    describeWithUserSignedUp('with authenticated context', (getContext) => {
      let returnCode: number;
      let stdout: string;
      let context: UserSignedUpContext;

      beforeEach(async () => {
        context = await getContext();
        const result = await context.runCli('whoami');

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
        expect(stdout).toMatchOutput([
          `Host: ${getPackmindInstanceUrl()}`,
          `Organization: ${context.organization.name}`,
          `User: ${context.user.email}`,
        ]);
      });
    });
  });

  describeForVersion('>= 0.24.0', 'when user is not signed in', () => {
    describeWithTempSpace('context', (getContext) => {
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
});
