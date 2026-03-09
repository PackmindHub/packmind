const {
  swcTransform,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'coding-agent',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/coding-agent',
  transformIgnorePatterns: ['node_modules/(?!(slug)/)'],
};
