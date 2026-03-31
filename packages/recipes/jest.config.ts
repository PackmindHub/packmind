 
const { compilerOptions } = require('../../tsconfig.base.effective.json');
 
const {
  pathsToModuleNameMapper,
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'recipes',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransform,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/recipes',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
