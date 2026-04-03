import {
  runCli,
  updateFile,
  readFile,
  RunCliResult,
  describeForVersion,
} from './helpers';
import { describeWithTempSpace } from './helpers/describeWithTempSpace';

describeForVersion('> 0.24.0', 'config agents commands', () => {
  describeWithTempSpace(
    'when packmind.json has agents ["claude"]',
    (getContext) => {
      let testDir: string;

      beforeEach(async () => {
        const context = await getContext();
        testDir = context.testDir;

        updateFile(
          'packmind.json',
          JSON.stringify({ packages: {}, agents: ['claude'] }),
          testDir,
        );
      });

      describe('config agents add cursor', () => {
        let addResult: RunCliResult;

        beforeEach(async () => {
          addResult = await runCli('config agents add cursor', {
            cwd: testDir,
          });
        });

        it('succeeds', () => {
          expect(addResult.returnCode).toBe(0);
        });

        it('keeps claude in packmind.json', () => {
          const config = JSON.parse(readFile('packmind.json', testDir));

          expect(config.agents).toContain('claude');
        });

        it('adds cursor to packmind.json', () => {
          const config = JSON.parse(readFile('packmind.json', testDir));

          expect(config.agents).toContain('cursor');
        });
      });

      describe('config agents list after adding cursor', () => {
        let listResult: RunCliResult;

        beforeEach(async () => {
          await runCli('config agents add cursor', { cwd: testDir });
          listResult = await runCli('config agents list', { cwd: testDir });
        });

        it('succeeds', () => {
          expect(listResult.returnCode).toBe(0);
        });

        it('displays claude', () => {
          expect(listResult.stdout).toContain('claude');
        });

        it('displays cursor', () => {
          expect(listResult.stdout).toContain('cursor');
        });
      });

      describe('config agents rm cursor after adding it', () => {
        let rmResult: RunCliResult;
        let listResult: RunCliResult;

        beforeEach(async () => {
          await runCli('config agents add cursor', { cwd: testDir });
          rmResult = await runCli('config agents rm cursor', {
            cwd: testDir,
          });
          listResult = await runCli('config agents list', { cwd: testDir });
        });

        it('succeeds', () => {
          expect(rmResult.returnCode).toBe(0);
        });

        it('keeps claude in packmind.json', () => {
          const config = JSON.parse(readFile('packmind.json', testDir));

          expect(config.agents).toContain('claude');
        });

        it('removes cursor from packmind.json', () => {
          const config = JSON.parse(readFile('packmind.json', testDir));

          expect(config.agents).not.toContain('cursor');
        });

        it('shows claude in config agents list', () => {
          expect(listResult.stdout).toContain('claude');
        });

        it('does not show cursor in config agents list', () => {
          expect(listResult.stdout).not.toContain('cursor');
        });
      });
    },
  );
});
