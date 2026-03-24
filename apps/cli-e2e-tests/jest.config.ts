// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  swcTransformWithDefineFields,
  standardModuleFileExtensions,
} from '../../jest-utils';

interface CustomMatchers<R = unknown> {
  toMatchOutput(expected: string | Array<string>): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

export default {
  displayName: 'cli-e2e-tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli-e2e-tests',
  testTimeout: 30000, // E2E tests may take longer
  setupFilesAfterEnv: ['<rootDir>/src/helpers/matchers.ts'],
};
