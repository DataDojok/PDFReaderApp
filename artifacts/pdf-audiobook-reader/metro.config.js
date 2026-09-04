const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent web-only dependencies from being bundled for native platforms
config.resolver.blockList = [
  /node_modules\/pdfjs-dist\/.*(?<!legacy)/,
  /node_modules\/pdfjs-dist\/build\/pdf\.worker/,
];

// Exclude the main pdfjs build but allow legacy build used in pdfParser.ts
config.resolver.sourceExts = ['native', 'jsx', 'js', 'json', 'ts', 'tsx'];

module.exports = config;
