const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config().parsed || {};

// Reduce it to a nice object, the same as before
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  entry: {
    main: './frontend/src/index.ts',
    // Separate entry for service worker
    sw: './frontend/src/service-worker.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
      '@game': path.resolve(__dirname, 'frontend/src/game'),
      '@scenes': path.resolve(__dirname, 'frontend/src/scenes'),
      '@objects': path.resolve(__dirname, 'frontend/src/objects'),
      '@systems': path.resolve(__dirname, 'frontend/src/systems'),
      '@utils': path.resolve(__dirname, 'frontend/src/utils'),
      '@types': path.resolve(__dirname, 'frontend/src/types'),
      '@ui': path.resolve(__dirname, 'frontend/src/ui'),
      '@config': path.resolve(__dirname, 'frontend/src/config'),
      '@core': path.resolve(__dirname, 'frontend/src/core'),
      '@services': path.resolve(__dirname, 'frontend/src/services'),
    },
    // Phaser.js specific optimizations
    fallback: {
      "fs": false,
      "tls": false,
      "net": false,
      "path": false,
      "zlib": false,
      "http": false,
      "https": false,
      "stream": false,
      "crypto": false,
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: false,
            }
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Speed up compilation in development
              experimentalWatchApi: true,
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
            },
          },
          'postcss-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              sassOptions: {
                fiber: false,
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name].[hash:8][ext]',
        },
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8kb - inline smaller images
          }
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.(ogg|mp3|wav|m4a|aac|flac)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/audio/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.(mp4|webm|ogg|avi|mov)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/video/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.(atlas|json5?)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/data/[name].[hash:8][ext]',
        },
        exclude: [/node_modules/, /package\.json$/, /tsconfig\.json$/, /\.config\.js$/],
      },
      // Special handling for Phaser's XML/JSON files
      {
        test: /\.(xml|json)$/,
        type: 'asset/source',
        exclude: [/node_modules/, /package\.json$/, /tsconfig\.json$/],
      }
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      ...envKeys,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new HtmlWebpackPlugin({
      template: './frontend/public/index.html',
      chunks: ['main'], // Exclude service worker from HTML
      title: 'Llama Wool Farm',
      meta: {
        viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        description: 'Manage your llama farm and produce the finest wool in this addictive idle clicker game!',
        'theme-color': '#4A90E2',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
        'mobile-web-app-capable': 'yes',
      },
      inject: 'body',
      scriptLoading: 'defer',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'frontend/public/assets', to: 'assets', noErrorOnMissing: true },
        { from: 'frontend/public/icons', to: 'icons', noErrorOnMissing: true },
        { from: 'frontend/public/manifest.json', to: 'manifest.json', noErrorOnMissing: true },
        // Copy Phaser's static assets if any
        { 
          from: 'node_modules/phaser/dist/phaser.min.js', 
          to: 'lib/phaser.min.js',
          noErrorOnMissing: true 
        },
      ],
    }),
    new WebpackPwaManifest({
      name: 'Llama Wool Farm',
      short_name: 'LlamaFarm',
      description: 'Manage your llama farm and produce the finest wool!',
      background_color: '#ffffff',
      theme_color: '#4A90E2',
      display: 'standalone',
      orientation: 'any',
      start_url: '/',
      scope: '/',
      ios: true,
      icons: [
        {
          src: path.resolve(__dirname, 'frontend/public/icons/icon-512.png'),
          sizes: [96, 128, 192, 256, 384, 512],
          purpose: 'any maskable',
          ios: true,
        },
        {
          src: path.resolve(__dirname, 'frontend/public/icons/icon-1024.png'),
          size: '1024x1024',
          purpose: 'any maskable',
          ios: 'startup',
        },
      ],
      inject: true,
      fingerprints: true,
      includeDirectory: true,
      publicPath: '/',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        // Extract Phaser into its own chunk for better caching
        phaser: {
          test: /[\\/]node_modules[\\/]phaser[\\/]/,
          name: 'phaser',
          priority: 30,
          enforce: true,
        },
        // React and related libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-redux|@reduxjs)[\\/]/,
          name: 'react-vendor',
          priority: 20,
        },
        // Other vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // Game core modules
        gameCore: {
          test: /[\\/]frontend[\\/]src[\\/]game[\\/]core[\\/]/,
          name: 'game-core',
          priority: 5,
          minChunks: 2,
        },
        // UI components
        ui: {
          test: /[\\/]frontend[\\/]src[\\/]game[\\/]ui[\\/]/,
          name: 'game-ui',
          priority: 5,
          minChunks: 2,
        },
        // Common utilities
        common: {
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
    moduleIds: 'deterministic', // Better long-term caching
  },
  performance: {
    hints: false, // We'll handle this in dev/prod configs
  },
};