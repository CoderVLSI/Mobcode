const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// All expo-router internal assets that Metro can't resolve from inside node_modules
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
    path.resolve(__dirname, `node_modules/expo-router/assets/${name}`),
  ])
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (assetMap[moduleName]) {
    return { filePath: assetMap[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
