import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  ...tseslint.configs.recommended,
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
            '^@packmind/(deployments|git|recipes|standards|linter|analytics|spaces)/test',
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
];
