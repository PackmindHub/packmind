// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';
import fs from 'fs';
import path from 'path';
import os from 'os';

export type WithTempSpaceContext = {
  testDir: string; // Temporary directory for test execution
  testHome: string;
};

export function describeWithTempSpace(
  description: string,
  tests: (getContext: () => Promise<WithTempSpaceContext>) => void,
): void {
  describe(description, () => {
    let testDir: string;
    let testHome: string;

    stage(async (): Promise<WithTempSpaceContext> => {
      // Create a temporary directory for this test execution
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));
      testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-home-'));

      return { testDir, testHome };
    });

    // Clean up test directory after each test
    afterEach(async () => {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }

      if (testHome && fs.existsSync(testHome)) {
        fs.rmSync(testHome, { recursive: true, force: true });
      }
    });

    // Pass the stage getter to tests
    tests(async () => stage());
  });
}
