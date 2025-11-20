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
    const mappedValue = prefix + value.replace(/\*/g, '\\$1');
    moduleNameMapper[regexKey] = mappedValue;
  }
  return moduleNameMapper;
}

export default {
  displayName: 'spaces',
  preset: '../../jest.preset.ts',
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
  transformIgnorePatterns: ['/node_modules/(?!slug).+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/spaces',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
  passWithNoTests: true,
};
