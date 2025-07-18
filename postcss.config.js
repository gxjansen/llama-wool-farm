module.exports = {
  plugins: {
    'autoprefixer': {},
    'cssnano': {
      preset: ['default', {
        discardComments: {
          removeAll: true,
        },
        normalizeWhitespace: true,
        colormin: true,
        convertValues: true,
        reduceIdents: true,
        mergeRules: true,
      }]
    }
  }
};