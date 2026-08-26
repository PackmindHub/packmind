import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/react'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/test-setup.ts',
    ],
    rules: {
      // The suite runs with `isolate: false` (see vite.config.ts), so a module's
      // mock registration outlives the spec file that made it. A bare automock
      // and a factory mock for the same module share one registration, and the
      // spec that runs second silently inherits the other's shape — an
      // order-dependent failure that moves around between runs. Passing a
      // factory makes each spec's mock self-describing and immune to that.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|doMock)$/][arguments.length=1]",
          message:
            'Give vi.mock a factory: vi.mock(path, () => ({ ... })). A bare automock shares its registration with any factory mock of the same module, and under isolate:false the spec that runs second inherits the wrong shape.',
        },
      ],
    },
  },
];
