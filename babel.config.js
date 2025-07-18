module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        corejs: 3,
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
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
        development: process.env.NODE_ENV !== 'production',
      },
    ],
  ],
  plugins: [
    // Production optimizations
    ...(process.env.NODE_ENV === 'production' ? [
      ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
    ] : []),
    // Development optimizations
    ...(process.env.NODE_ENV === 'development' ? [
      ['@babel/plugin-transform-react-jsx-development'],
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
        '@babel/preset-react',
      ],
    },
  },
};