 
const { compilerOptions } = require('../../tsconfig.base.effective.json');
 
const {
  pathsToModuleNameMapper,
  swcTransformWithDecoratorsOnly,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'editions',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransformWithDecoratorsOnly,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/editions',
  passWithNoTests: true,
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
