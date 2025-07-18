const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

// Check if SSL certificates exist
const sslPath = path.join(__dirname, 'ssl');
const httpsConfig = fs.existsSync(path.join(sslPath, 'server.key')) ? {
  key: fs.readFileSync(path.join(sslPath, 'server.key')),
  cert: fs.readFileSync(path.join(sslPath, 'server.crt')),
} : true; // Use webpack-dev-server's self-signed certificate if custom ones don't exist

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map', // Fast rebuilds with good debugging
  output: {
    filename: 'js/[name].bundle.js',
    chunkFilename: 'js/[name].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true,
    // Enable HMR asset updates
    assetModuleFilename: 'assets/[name][ext]',
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'public'),
        publicPath: '/public',
      }
    ],
    compress: true,
    port: 3000,
    hot: true, // Enable HMR
    liveReload: false, // Disable live reload in favor of HMR
    https: httpsConfig, // Enable HTTPS
    host: 'localhost',
    allowedHosts: 'all',
    open: true,
    historyApiFallback: {
      index: '/index.html',
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: true,
      },
      progress: true,
      reconnect: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    // Phaser.js specific dev server settings
    watchFiles: {
      paths: ['src/**/*', 'public/**/*'],
      options: {
        usePolling: false,
      },
    },
    // WebSocket settings for better HMR with Phaser
    webSocketServer: {
      options: {
        path: '/ws',
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
              compilerOptions: {
                sourceMap: true,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.DEBUG': JSON.stringify('true'),
      __DEV__: true,
      __PROD__: false,
    }),
    // HMR plugin is automatically added when hot: true in devServer
    // Show module paths in HMR logs
    new webpack.HotModuleReplacementPlugin({
      multiStep: true,
      fullBuildTimeout: 200,
    }),
    // Phaser.js specific - ensure proper global handling
    new webpack.ProvidePlugin({
      PIXI: 'phaser/src/pixi',
      Phaser: 'phaser',
    }),
    // Better error handling in development
    new webpack.NoEmitOnErrorsPlugin(),
    // Fork TS checker for better performance
    new (require('fork-ts-checker-webpack-plugin'))({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
  ],
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        default: false,
        defaultVendors: false,
        // In dev, we want faster rebuilds so less aggressive splitting
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
        phaser: {
          test: /[\\/]node_modules[\\/]phaser[\\/]/,
          name: 'phaser',
          chunks: 'all',
          priority: 10,
        },
      },
    },
    runtimeChunk: 'single',
    moduleIds: 'named',
    chunkIds: 'named',
  },
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    buildDependencies: {
      config: [__filename],
    },
  },
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
  },
});

// Add HMR acceptance for better Phaser.js integration
if (module.hot) {
  module.hot.accept((err) => {
    console.error('HMR Error:', err);
  });
}