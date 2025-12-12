// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.effective.json';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  pathsToModuleNameMapper,
  swcTransformWithDecorators,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
  displayName: '@packmind/integration-tests',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: swcTransformWithDecorators,
  transformIgnorePatterns: ['node_modules/(?!(slug)/)'],
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/integration-tests',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
  testTimeout: 10000, // Reduced from 30s to catch slow tests earlier
  maxWorkers: 1, // Run tests serially (runInBand) to reduce memory pressure
};
