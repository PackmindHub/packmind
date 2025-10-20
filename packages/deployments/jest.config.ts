import { pathsToModuleNameMapper } from 'ts-jest';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.json';

export default {
  displayName: 'deployments',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/deployments',
  transformIgnorePatterns: ['/node_modules/(?!slug).+\\.js$'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../../',
  }),
};
