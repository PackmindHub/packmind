/* eslint-disable @typescript-eslint/no-require-imports */
const { join } = require('path');

// Base webpack alias paths shared by both OSS and proprietary versions
module.exports = function getBaseWebpackPaths(__dirname) {
  return {
    '@packmind/accounts': join(__dirname, '../../packages/accounts/src'),
    '@packmind/recipes': join(__dirname, '../../packages/recipes/src'),
    '@packmind/recipes/types': join(
      __dirname,
      '../../packages/recipes/src/types',
    ),
    '@packmind/node-utils': join(__dirname, '../../packages/node-utils/src'),
    '@packmind/types': join(__dirname, '../../packages/types/src'),
    '@packmind/migrations': join(__dirname, '../../packages/migrations/src'),
    '@packmind/spaces': join(__dirname, '../../packages/spaces/src'),
    '@packmind/git': join(__dirname, '../../packages/git/src'),
    '@packmind/packmind-ui': join(__dirname, '../../packages/packmind-ui/src'),
    '@packmind/standards': join(__dirname, '../../packages/standards/src'),
    '@packmind/standards/types': join(
      __dirname,
      '../../packages/standards/src/types',
    ),
    '@packmind/test-utils': join(__dirname, '../../packages/test-utils/src'),
    '@packmind/deployments': join(__dirname, '../../packages/deployments/src'),
    '@packmind/coding-agent': join(
      __dirname,
      '../../packages/coding-agent/src',
    ),
    '@packmind/jobs': join(__dirname, '../../packages/jobs/src'),
    '@packmind/logger': join(__dirname, '../../packages/logger/src'),
  };
};
