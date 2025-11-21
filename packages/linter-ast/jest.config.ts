import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Nx loads Jest configs through ts-node without inheriting the root
 * tsconfig's resolveJsonModule flag for this package. Reading the JSON
 * manually guarantees we can reuse the shared compilerOptions.
 */
const { compilerOptions } = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../tsconfig.base.effective.json'),
    'utf-8',
  ),
);
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  pathsToModuleNameMapper,
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
  displayName: 'linter-ast',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  transform: swcTransform,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/linter-ast',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
