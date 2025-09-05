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
    // Proprietary version uses the real analytics package
    '@packmind/analytics': join(__dirname, '../../packages/analytics/src'),
    '@packmind/jobs': join(__dirname, '../../packages/jobs/src'),
    '@packmind/linter': join(__dirname, '../../packages/linter/src'),
    // Add other proprietary-specific overrides here as needed
  };
};
