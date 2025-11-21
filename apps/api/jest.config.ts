// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.effective.json';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  pathsToModuleNameMapper,
  swcTransformWithDecorators,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
  displayName: 'api',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransformWithDecorators,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/api',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
