/* eslint-disable @typescript-eslint/no-require-imports */
const { join, resolve } = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
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

  optimization: {
    minimize: true,
    minimizer: [
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          keep_classnames: true, // Preserve class names for NestJS DI
          keep_fnames: true, // Preserve function names for decorators and reflection
        },
      }),
    ],
  },

  resolve: {
    extensions: ['.ts', '.js', '.wasm'],
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
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ],
  },

  experiments: {
    asyncWebAssembly: true,
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin({
      async: true,
      typescript: {
        configFile: join(__dirname, 'tsconfig.app.json'),
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
      issue: {
        // Exclude web-tree-sitter module not found errors since webpack handles them correctly
        exclude: [
          { file: '**/node_modules/**' },
          { origin: 'typescript', code: 'TS2307', file: '**/*Parser.ts' },
        ],
      },
    }),
    // Only copy WASM files in enterprise mode (not in OSS mode)
    ...(!isOssMode
      ? [
          new CopyWebpackPlugin({
            patterns: [
              {
                // Copy all WASM files (including versioned tree-sitter files for PHP)
                from: join(__dirname, '../../packages/linter-ast/res/*.wasm'),
                to: join(__dirname, '../../dist/apps/api/[name][ext]'),
              },
            ],
          }),
        ]
      : []),
  ],

  externals: ({ request }, callback) => {
    // Bundle all @packmind packages (including linter-ast with tree-sitter dependencies)
    if (request?.startsWith('@packmind/')) {
      return callback();
    }

    // Bundle web-tree-sitter (needed by linter-ast)
    if (request === 'web-tree-sitter') {
      return callback();
    }

    // Externalize npm packages (but not @packmind or web-tree-sitter)
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
