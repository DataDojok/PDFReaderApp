module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Forces the compiler to handle modern private properties smoothly
          unstable_transformProfile: 'hermes-stable'
        }
      ]
    ],
    plugins: [
      // Make sure any plugins you use (like reanimated) are kept down here
    ]
  };
};
