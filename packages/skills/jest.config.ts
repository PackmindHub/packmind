// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.effective.json';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  pathsToModuleNameMapper,
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
  displayName: 'skills',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransform,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/skills',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
