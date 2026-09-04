const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block pdfjs-dist completely for native builds
config.resolver.blockList = [
  /node_modules\/pdfjs-dist\/.*/,
];

// Also exclude from resolving any pdfjs references
if (!config.resolver.extraNodeModules) {
  config.resolver.extraNodeModules = {};
}

module.exports = config;
