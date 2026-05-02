const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Directly resolve expo-router's internal assets that Metro can't find
// when required from inside node_modules via bare package specifiers.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/assets/logotype.png') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-router/assets/logotype.png'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
