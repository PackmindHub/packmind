/* eslint-disable @typescript-eslint/no-require-imports */
const { join } = require('path');
const getBaseWebpackPaths = require('./webpack.paths.base');

// OSS-specific webpack alias paths
// Used when PACKMIND_EDITION=oss
// These override base paths for the open source version
module.exports = function getOssWebpackPaths(__dirname) {
  const basePaths = getBaseWebpackPaths(__dirname);

  return {
    ...basePaths,
    // OSS version uses stubs from editions package
    '@packmind/analytics': join(__dirname, '../../packages/editions/src'),
    '@packmind/linter': join(__dirname, '../../packages/editions/src'),
    '@packmind/amplitude': join(__dirname, '../../packages/editions/src'),
    '@packmind/plugins': join(__dirname, '../../packages/editions/src'),
    '@packmind/import-practices-legacy': join(
      __dirname,
      '../../packages/editions/src',
    ),
    // Add other OSS-specific overrides here as needed
  };
};
