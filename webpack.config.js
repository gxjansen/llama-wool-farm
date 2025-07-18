const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const config = isProduction 
    ? require('./webpack.prod.js')
    : require('./webpack.dev.js');
  
  return merge(common, config);
};