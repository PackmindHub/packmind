import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import packmind from './eslint/index.js';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  ...tseslint.configs.recommended,
  {
    // Enforce PascalCase use-case file naming (bans legacy <name>.usecase.ts).
    // Glob is project-relative because `nx lint` runs `eslint .` with cwd = project dir.
    files: ['**/application/useCases/**/*.ts'],
    plugins: { packmind },
    rules: { 'packmind/use-case-filename': 'error' },
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
    files: ['**/jest.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
