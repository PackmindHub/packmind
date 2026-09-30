const {
  swcTransformWithDefineFields,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'packmind-cli',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli',
  transformIgnorePatterns: [
    'node_modules/(?!(?:.*[\\\\/])?(chalk|#ansi-styles|#supports-color|slug)[@\\\\/])',
  ],
};
