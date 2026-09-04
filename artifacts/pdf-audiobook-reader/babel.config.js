module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
          lazyImports: true
        }
      ]
    ],
    plugins: [
      '@babel/plugin-transform-class-static-block',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-private-property-in-object'
    ]
  };
};
