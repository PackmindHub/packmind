// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  swcTransformWithDefineFields,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
  displayName: 'cli-e2e-tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli-e2e-tests',
  testTimeout: 30000, // E2E tests may take longer
};
