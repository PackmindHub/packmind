import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import packmind from './eslint-rules/index.js';

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
    // `jest.config.ts` plus variants like `jest.arch.config.ts` (the
    // architecture-tests project uses a non-default name so the @nx/jest plugin
    // doesn't infer a `test` target for it).
    files: ['**/jest.config.ts', '**/jest.*.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
