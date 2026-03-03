// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';
import fs from 'fs';
import path from 'path';
import os from 'os';

export type WithTempSpaceContext = {
  testDir: string; // Temporary directory for test execution
};

export function describeWithTempSpace(
  description: string,
  tests: (getContext: () => Promise<WithTempSpaceContext>) => void,
): void {
  describe(description, () => {
    let testDir: string;

    stage(async (): Promise<WithTempSpaceContext> => {
      // Create a temporary directory for this test execution
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));

      return { testDir };
    });

    // Clean up test directory after each test
    afterEach(async () => {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    // Pass the stage getter to tests
    tests(async () => stage());
  });
}
