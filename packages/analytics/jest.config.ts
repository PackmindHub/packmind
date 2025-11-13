import { pathsToModuleNameMapper } from 'ts-jest';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.json';

export default {
  displayName: 'analytics',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!slug).+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/analytics',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../../',
  }),
};
