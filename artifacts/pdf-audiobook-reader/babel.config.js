module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Natively handles modern private properties without conflicting with reanimated
          unstable_transformProfile: 'hermes-stable'
        }
      ]
    ],
    plugins: [
      // If you use reanimated, its plugin must be listed at the very end of this array
    ]
  };
};
