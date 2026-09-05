module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
          lazyImports: false
        }
      ]
    ],
    plugins: [
      // Force Babel to transpile ES6 classes into ES5 functions
      '@babel/plugin-transform-classes',
      
      // Keep your existing plugins below
      '@babel/plugin-transform-class-static-block',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-private-property-in-object'
    ]
  };
};
