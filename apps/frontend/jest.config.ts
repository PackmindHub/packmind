const { pathsToModuleNameMapper } = require('ts-jest');

// Use require instead of import to avoid TypeScript compilation issues

const { compilerOptions } = require('../../tsconfig.base.effective.json');

module.exports = {
  preset: '../../jest.preset.ts',
  displayName: 'frontend',
  rootDir: '.',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.*[\\\\/])?(slug|marked|@chakra-ui|@zag-js|framer-motion|lucide-react)[@\\\\/]).+\\.[tj]sx?$',
  ],
  testMatch: [
    '<rootDir>/src/**/*.(spec|test).[jt]s?(x)',
    '<rootDir>/app/**/*.(spec|test).[jt]s?(x)',
  ],
  // The @nx/jest preset dropped tsx/jsx from moduleFileExtensions for Jest 30,
  // which silently excluded every .tsx test from discovery. Keep the full list
  // here so component tests stay in the suite.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/frontend',
  moduleNameMapper: {
    // Specific icons path must come before the general assets path
    '^@packmind/assets/icons/(.*)$': '<rootDir>/../../packages/assets/icons/$1',
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/../../',
    }),
    '\\.(woff|woff2|eot|ttf|otf)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testTimeout: 15000,
  // maxWorkers: 2 provides some parallelization while avoiding EPERM errors on macOS
  // In CI (Linux), use more workers for faster execution
  maxWorkers: process.env.CI ? '50%' : 2,
};
