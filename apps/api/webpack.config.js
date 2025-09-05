/* eslint-disable @typescript-eslint/no-require-imports */
const { join, resolve } = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const getOssWebpackPaths = require('./webpack.paths.oss');
const getProprietaryWebpackPaths = require('./webpack.paths.proprietary');

// Determine which paths to use based on PACKMIND_EDITION environment variable
// Default is 'enterprise' if not 'oss'
const isOssMode = process.env.PACKMIND_EDITION === 'oss';
const getWebpackPaths = isOssMode
  ? getOssWebpackPaths
  : getProprietaryWebpackPaths;

module.exports = {
  context: __dirname,
  entry: resolve(__dirname, 'src/main.ts'),
  target: 'node',
  mode: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',

  cache: {
    type: 'filesystem',
    cacheDirectory: join(__dirname, '../../.cache/webpack/api'),
    buildDependencies: { config: [__filename] },
  },

  devtool:
    process.env.NODE_ENV === 'development' ? 'inline-cheap-source-map' : false,

  output: {
    path: join(__dirname, '../../dist/apps/api'),
    filename: 'main.js',
    clean: false,
  },

  resolve: {
    extensions: ['.ts', '.js'],
    alias: getWebpackPaths(__dirname),
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: join(__dirname, 'tsconfig.app.json'),
          },
        },
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin({
      async: true,
      typescript: { configFile: join(__dirname, 'tsconfig.app.json') },
    }),
  ],

  externals: ({ request }, callback) => {
    // Bundle @packmind packages
    if (request?.startsWith('@packmind/')) {
      return callback();
    }

    // Externalize npm packages (but not @packmind)
    if (/^[a-z@][a-z.\-_0-9/]*$/i.test(request)) {
      return callback(null, 'commonjs ' + request);
    }

    // Bundle everything else (Node.js built-ins are handled automatically by webpack for target: 'node')
    callback();
  },

  watchOptions: {
    poll: Number(
      process.env.WEBPACK_POLL || process.env.CHOKIDAR_INTERVAL || 500,
    ),
    aggregateTimeout: 200,
    ignored: /node_modules/,
  },
};
