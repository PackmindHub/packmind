// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.effective.json';

// Helper to convert TypeScript paths to Jest moduleNameMapper format
function pathsToModuleNameMapper(
  paths: Record<string, string[]>,
  prefix: string,
) {
  const moduleNameMapper: Record<string, string> = {};
  for (const [key, [value]] of Object.entries(paths)) {
    // Convert TS path pattern to Jest regex pattern
    const regexKey = '^' + key.replace(/\*/g, '(.*)') + '$';
    const mappedValue = prefix + value.replace(/\*/g, '$1');
    moduleNameMapper[regexKey] = mappedValue;
  }
  return moduleNameMapper;
}

export default {
  displayName: '@packmind/integration-tests',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: true, // Enable decorators for NestJS
          },
          target: 'es2022',
          transform: {
            legacyDecorator: true, // Use legacy decorator implementation
            decoratorMetadata: true, // Enable decorator metadata (needed for NestJS DI)
            useDefineForClassFields: false,
          },
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(slug)/)'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/integration-tests',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
  testTimeout: 30000,
};
