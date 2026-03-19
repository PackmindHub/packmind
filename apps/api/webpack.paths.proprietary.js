/* eslint-disable @typescript-eslint/no-require-imports */
const { join } = require('path');
const getBaseWebpackPaths = require('./webpack.paths.base');

// Proprietary-specific webpack alias paths
// Used when PACKMIND_EDITION=enterprise (default)
// These override base paths for the proprietary version
module.exports = function getProprietaryWebpackPaths(__dirname) {
  const basePaths = getBaseWebpackPaths(__dirname);

  return {
    ...basePaths,
    '@packmind/linter': join(__dirname, '../../packages/linter/src'),
    '@packmind/amplitude': join(__dirname, '../../packages/amplitude/src'),
    '@packmind/crisp': join(__dirname, '../../packages/crisp/src'),
    '@packmind/plugins': join(__dirname, '../../packages/plugins/src'),
    '@packmind/import-practices-legacy': join(
      __dirname,
      '../../packages/import-practices-legacy/src',
    ),
    '@packmind/spaces-management': join(
      __dirname,
      'src/app/organizations/spaces-management',
    ),
    // Add other proprietary-specific overrides here as needed
  };
};
