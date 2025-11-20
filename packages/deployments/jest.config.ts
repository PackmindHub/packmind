// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.json';

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
  displayName: 'deployments',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: false },
          target: 'es2022',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/deployments',
  transformIgnorePatterns: ['/node_modules/(?!slug).+\\.js$'],
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
