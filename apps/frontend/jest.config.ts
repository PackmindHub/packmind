import { pathsToModuleNameMapper } from 'ts-jest';

// Use require instead of import to avoid TypeScript compilation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compilerOptions } = require('../../tsconfig.base.effective.json');

// Filter to only include @packmind/ modules
const allPaths = compilerOptions.paths as Record<string, string[]>;
const packmindPaths = Object.fromEntries(
  Object.entries(allPaths).filter(([key]) => key.startsWith('@packmind/')),
) as Record<string, string[]>;

export default {
  preset: '../../jest.preset.ts',
  displayName: 'frontend',
  rootDir: '.',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(slug|marked)).+\\.js$'],
  testMatch: ['<rootDir>/src/**/*.(spec|test).[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/frontend',
  moduleNameMapper: {
    ...pathsToModuleNameMapper(packmindPaths, {
      prefix: '<rootDir>/../../',
    }),
    '\\.(woff|woff2|eot|ttf|otf)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|css|less|scss|sass)$': 'identity-obj-proxy',
    '^@packmind/assets$': '<rootDir>/../../packages/assets/src/index.ts',
    '^@packmind/assets/(.*)$': '<rootDir>/../../packages/assets/src/$1',
  },
};
