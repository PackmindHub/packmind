const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { compilerOptions } = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../tsconfig.base.effective.json'),
    'utf-8',
  ),
);

const {
  pathsToModuleNameMapper,
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
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
