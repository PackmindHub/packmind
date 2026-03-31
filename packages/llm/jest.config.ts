 
const {
  swcTransform,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'llm',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/llm',
  passWithNoTests: true,
};
