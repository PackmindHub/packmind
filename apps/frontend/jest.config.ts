import { pathsToModuleNameMapper } from 'ts-jest';

// Use require instead of import to avoid TypeScript compilation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compilerOptions } = require('../../tsconfig.base.effective.json');

export default {
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
    '/node_modules/(?!(slug|marked|@chakra-ui|@zag-js|framer-motion|lucide-react)).+\\.[tj]sx?$',
  ],
  testMatch: ['<rootDir>/src/**/*.(spec|test).[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/frontend',
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/../../',
    }),
    '\\.(woff|woff2|eot|ttf|otf)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|css|less|scss|sass)$': 'identity-obj-proxy',
    '^@packmind/assets$': '<rootDir>/../../packages/assets/src/index.ts',
    '^@packmind/assets/(.*)$': '<rootDir>/../../packages/assets/src/$1',
  },
  testTimeout: 15000,
  // Workaround for macOS jest-worker EPERM errors
  // Use parallel workers in CI (Linux), single worker on macOS to avoid EPERM
  maxWorkers: process.env.CI ? '50%' : 1,
};
