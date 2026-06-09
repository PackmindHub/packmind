import baseConfig from '../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // ESLint rules/plugin are authored as CommonJS modules, so require() is expected.
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
