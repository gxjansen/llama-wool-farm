module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['> 0.2%', 'not dead', 'not op_mini all'],
        },
        modules: false, // Let webpack handle modules
        debug: false,
      },
    ],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
        onlyRemoveTypeImports: true,
      },
    ],
  ],
  plugins: [
    // Production optimizations
    ...(process.env.NODE_ENV === 'production' ? [
      // Add production plugins here if needed
    ] : []),
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
        '@babel/preset-typescript',
      ],
    },
  },
};