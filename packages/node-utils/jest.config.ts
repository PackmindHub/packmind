 
const { compilerOptions } = require('../../tsconfig.base.effective.json');
 
const {
  pathsToModuleNameMapper,
  swcTransform,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: '@packmind/node-utils',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/node-utils',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
