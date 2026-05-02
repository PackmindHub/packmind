// jest-utils at the workspace root is a .ts file. Importing it bare fails
// under Node 22's native ESM loader (used by some test runners), and importing
// it with the .ts extension fails under ts-node/ts-jest (used by the CI
// runner) without allowImportingTsExtensions. The two helpers we need are
// trivial; inline them here to stay portable across loaders.
const swcTransformWithDefineFields = {
  '^.+\\.[tj]s$': [
    '@swc/jest',
    {
      jsc: {
        parser: { syntax: 'typescript' as const, tsx: false },
        target: 'es2022' as const,
        transform: { useDefineForClassFields: false },
      },
      module: { type: 'commonjs' as const },
    },
  ],
};

const standardModuleFileExtensions = ['ts', 'js', 'html'];

export default {
  displayName: 'packmind-cli',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli',
  transformIgnorePatterns: [
    '/node_modules/(?!(chalk|#ansi-styles|#supports-color|slug)/)',
  ],
};
