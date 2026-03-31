 
const {
  swcTransform,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'migrations',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/migrations',
};
