import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import packmind from './eslint-rules/index.js';

// Type-aware rules only run on packages' domain and application layers, since
// parsing with type information is what costs the time — plus all of
// `packages/types`, which has no such layers but holds errors use cases throw.
// `nx lint` runs ESLint from the project dir; the legacy `@nx/eslint:lint`
// executor from the root.
const lintedDir = path.relative(import.meta.dirname, process.cwd());
const domainLayerFiles =
  lintedDir === ''
    ? [
        'packages/*/src/domain/**/*.ts',
        'packages/*/src/application/**/*.ts',
        'packages/types/src/**/*.ts',
      ]
    : /^packages[\\/][^\\/]+$/.test(lintedDir)
      ? [
          '**/src/domain/**/*.ts',
          '**/src/application/**/*.ts',
          ...(path.basename(lintedDir) === 'types' ? ['src/**/*.ts'] : []),
        ]
      : [];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  ...tseslint.configs.recommended,
  // Register the local workspace plugin once (globally) so both rules below can
  // reference it with different file scopes.
  { plugins: { packmind } },
  {
    // Structural use-case rules: ban legacy <name>.usecase.ts and require use-case
    // classes to end in "UseCase". Glob is project-relative because `nx lint` runs
    // `eslint .` with cwd = project dir. `shared/**` and `index.ts` are excluded:
    // they hold helpers/barrels, not use-case classes.
    files: ['**/application/useCases/**/*.ts'],
    ignores: [
      '**/application/useCases/**/shared/**',
      '**/application/useCases/**/index.ts',
    ],
    rules: { 'packmind/use-case-filename': 'error' },
  },
  {
    // Repo-wide: the use-case concept is spelled "UseCase", never "Usecase"
    // (filenames and identifiers alike).
    files: ['**/*.ts', '**/*.tsx'],
    rules: { 'packmind/usecase-casing': 'error' },
  },
  ...(domainLayerFiles.length > 0
    ? [
        {
          // Every error thrown from a domain or application layer must carry
          // a `kind`, or DomainExceptionFilter answers 500. Jobs and listeners
          // run outside the HTTP scope, so the filter never sees their errors.
          files: domainLayerFiles,
          ignores: [
            '**/*.spec.ts',
            '**/*.test.ts',
            '**/application/jobs/**',
            '**/application/listeners/**',
          ],
          languageOptions: {
            parserOptions: {
              projectService: true,
              tsconfigRootDir: process.cwd(),
            },
          },
          rules: { 'packmind/throw-kind-carrying-error': 'error' },
        },
      ]
    : []),
  {
    files: ['**/*.json'],
    // Override or add rules here
    rules: {},
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/build',
      '**/.react-router',
      '**/vitest.config.*.timestamp*',
      '**/.docusaurus',
      '**/js-playground',
      '**/js-playground-local',
      '**/.agents/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'env:node',
              onlyDependOnLibsWithTags: ['*'],
            },
            {
              sourceTag: 'env:shared',
              onlyDependOnLibsWithTags: ['env:shared', 'env:node'],
            },
            {
              sourceTag: 'env:browser',
              notDependOnLibsWithTags: ['env:node'],
              onlyDependOnLibsWithTags: ['env:shared', 'env:browser'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            '^@packmind/(deployments|git|recipes|skills|standards|linter|analytics|spaces)/test',
            '^@packmind/test-utils',
          ],
          depConstraints: [
            {
              sourceTag: 'env:node',
              onlyDependOnLibsWithTags: ['*'],
            },
            {
              sourceTag: 'env:shared',
              onlyDependOnLibsWithTags: ['env:shared', 'env:node'],
            },
            {
              sourceTag: 'env:browser',
              notDependOnLibsWithTags: ['env:node'],
              onlyDependOnLibsWithTags: ['env:shared', 'env:browser'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/jest.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
