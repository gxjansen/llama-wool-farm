const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const path = require('path');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map', // Full source maps for production debugging
  output: {
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true,
    // Asset optimization
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    crossOriginLoading: 'anonymous',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Skip type checking for faster builds
              experimentalWatchApi: false,
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer'],
                  ['cssnano', { preset: 'default' }],
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.DEBUG': JSON.stringify('false'),
      __DEV__: false,
      __PROD__: true,
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[id].[contenthash:8].css',
    }),
    // Use InjectManifest for enhanced service worker
    new WorkboxPlugin.InjectManifest({
      swSrc: './src/service-worker-enhanced.js',
      swDest: 'service-worker.js',
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      // Exclude large files and source maps
      exclude: [/\.map$/, /^manifest.*\.js$/, /\.LICENSE\.txt$/, /service-worker-enhanced\.js$/],
    }),
    // Compression for better performance
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
      deleteOriginalAssets: false,
    }),
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
      filename: '[path][base].br',
      deleteOriginalAssets: false,
    }),
    // Bundle analyzer (only when --analyze flag is used)
    process.argv.includes('--analyze') && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: '../bundle-report.html',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: '../bundle-stats.json',
    }),
  ].filter(Boolean),
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
        extractComments: false,
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        },
      }),
    ],
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    runtimeChunk: {
      name: 'runtime',
    },
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      maxSize: 244000, // Target 244KB chunks
      cacheGroups: {
        // Phaser core - critical for game
        phaser: {
          test: /[\\/]node_modules[\\/]phaser[\\/]/,
          name: 'phaser-engine',
          priority: 30,
          enforce: true,
          reuseExistingChunk: false,
        },
        // React ecosystem
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-redux|@reduxjs)[\\/]/,
          name: 'react-vendor',
          priority: 25,
          reuseExistingChunk: true,
        },
        // Heavy libraries
        heavyLibs: {
          test: /[\\/]node_modules[\\/](decimal\.js|localforage|socket\.io-client)[\\/]/,
          name: 'heavy-libs',
          priority: 20,
          reuseExistingChunk: true,
        },
        // Workbox and PWA utilities
        pwa: {
          test: /[\\/]node_modules[\\/]workbox-.*[\\/]/,
          name: 'pwa-utils',
          priority: 15,
          reuseExistingChunk: true,
        },
        // Other vendors
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `vendor-${packageName.replace('@', '')}`;
          },
          priority: 10,
          reuseExistingChunk: true,
        },
        // Game systems
        gameSystems: {
          test: /[\\/]src[\\/]game[\\/](systems|managers)[\\/]/,
          name: 'game-systems',
          priority: 8,
          minChunks: 2,
          reuseExistingChunk: true,
        },
        // Game UI
        gameUI: {
          test: /[\\/]src[\\/]game[\\/]ui[\\/]/,
          name: 'game-ui',
          priority: 7,
          minChunks: 2,
          reuseExistingChunk: true,
        },
        // Game scenes
        gameScenes: {
          test: /[\\/]src[\\/](game[\\/])?scenes[\\/]/,
          name: 'game-scenes',
          priority: 6,
          minChunks: 2,
          reuseExistingChunk: true,
        },
        // Common chunks
        common: {
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },
    // Tree shaking
    usedExports: true,
    sideEffects: false,
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000, // 500KB
    assetFilter: (assetFilename) => {
      // Don't warn about source maps and large images
      return !/\.(map|png|jpg|jpeg|gif|svg)$/.test(assetFilename);
    },
  },
  stats: {
    children: false,
    chunks: false,
    chunkModules: false,
    modules: false,
    reasons: false,
  },
});