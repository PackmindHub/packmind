/* eslint-disable @typescript-eslint/no-require-imports */
const { join } = require('path');

// Base webpack alias paths shared by both OSS and proprietary versions
module.exports = function getBaseWebpackPaths(__dirname) {
  return {
    '@packmind/accounts': join(__dirname, '../../packages/accounts/src'),
    '@packmind/accounts/types': join(
      __dirname,
      '../../packages/accounts/src/types',
    ),
    '@packmind/recipes': join(__dirname, '../../packages/recipes/src'),
    '@packmind/recipes/types': join(
      __dirname,
      '../../packages/recipes/src/types',
    ),
    '@packmind/shared': join(__dirname, '../../packages/shared/src'),
    '@packmind/shared/types': join(
      __dirname,
      '../../packages/shared/src/types',
    ),
    '@packmind/shared-nest': join(__dirname, '../../packages/shared-nest/src'),
    '@packmind/migrations': join(__dirname, '../../packages/migrations/src'),
    '@packmind/git': join(__dirname, '../../packages/git/src'),
    '@packmind/git/types': join(__dirname, '../../packages/git/src/types'),
    '@packmind/packmind-ui': join(__dirname, '../../packages/packmind-ui/src'),
    '@packmind/standards': join(__dirname, '../../packages/standards/src'),
    '@packmind/standards/types': join(
      __dirname,
      '../../packages/standards/src/types',
    ),
    '@packmind/deployments': join(__dirname, '../../packages/deployments/src'),
    '@packmind/deployments/types': join(
      __dirname,
      '../../packages/deployments/src/types',
    ),
    '@packmind/coding-agent': join(
      __dirname,
      '../../packages/coding-agent/src',
    ),
    '@packmind/jobs': join(__dirname, '../../packages/jobs/src'),
    '@packmind/linter': join(__dirname, '../../packages/linter/src'),
  };
};
