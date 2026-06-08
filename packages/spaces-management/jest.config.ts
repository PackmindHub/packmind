const { compilerOptions } = require('../../tsconfig.base.effective.json');

const {
  pathsToModuleNameMapper,
  swcTransformWithDecorators,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'spaces-management',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransformWithDecorators,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/spaces-management',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
  passWithNoTests: true,
};
