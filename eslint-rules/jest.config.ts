const {
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../jest-utils.ts');

module.exports = {
  displayName: 'eslint-rules',
  preset: '../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransform,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../coverage/eslint-rules',
};
