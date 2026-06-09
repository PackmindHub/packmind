const {
  swcTransform,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'crisp',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/crisp',
};
