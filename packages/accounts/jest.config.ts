const { compilerOptions } = require('../../tsconfig.base.effective.json');
const {
  pathsToModuleNameMapper,
  swcTransformWithDefineFields,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'accounts',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/accounts',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
