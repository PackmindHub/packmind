import { describeWithUserSignedUp, runCli } from './helpers';

describe('whoami command', () => {
  describeWithUserSignedUp('when user is signed in', (getContext) => {
    let apiKey: string;
    let testDir: string;
    let returnCode: number;
    let stdout: string;

    beforeAll(async () => {
      const context = await getContext();
      apiKey = context.apiKey;
      testDir = context.testDir;
    });

    beforeEach(async () => {
      const result = await runCli('whoami', { apiKey, cwd: testDir });

      returnCode = result.returnCode;
      stdout = result.stdout;
    });

    it('succeeds', () => {
      expect(returnCode).toEqual(0);
    });

    it('shows authenticated status', () => {
      expect(stdout).toContain('Authenticated');
    });

    it('shows host information', () => {
      expect(stdout).toContain('Host:');
    });
  });

  describeWithUserSignedUp('when user is not signed in', (getContext) => {
    let testDir: string;
    let returnCode: number;
    let stdout: string;

    beforeAll(async () => {
      const context = await getContext();
      testDir = context.testDir;
    });

    beforeEach(async () => {
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
