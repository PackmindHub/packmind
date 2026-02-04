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
        isolatedModules: true, // Faster compilation, less type checking
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
