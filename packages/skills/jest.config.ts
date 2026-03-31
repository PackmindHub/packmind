 
const { compilerOptions } = require('../../tsconfig.base.effective.json');
 
const {
  pathsToModuleNameMapper,
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
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
