const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// expo-router requires its own assets using bare package specifiers like
// require('expo-router/assets/logotype.png'). Metro can't get SHA-1 for files
// deep in node_modules, so we resolve them to local copies in assets/expo-router/
const EXPO_ROUTER_ASSETS = [
  'arrow_down.png',
  'error.png',
  'file.png',
  'forward.png',
  'logotype.png',
  'pkg.png',
  'sitemap.png',
  'unmatched.png',
];

const assetMap = Object.fromEntries(
  EXPO_ROUTER_ASSETS.map(name => [
    `expo-router/assets/${name}`,
    path.resolve(__dirname, `assets/expo-router/${name}`),
  ])
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (assetMap[moduleName]) {
    return { filePath: assetMap[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
