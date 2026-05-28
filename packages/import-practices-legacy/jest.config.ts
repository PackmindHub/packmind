const { compilerOptions } = require('../../tsconfig.base.effective.json');

const {
  pathsToModuleNameMapper,
  swcTransformWithDecorators,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'import-practices-legacy',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransformWithDecorators,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/import-practices-legacy',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
