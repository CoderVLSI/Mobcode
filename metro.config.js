const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve assets (like PNGs) required from inside node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Ensure expo-router's own assets directory is watched
config.watchFolders = [path.resolve(__dirname, 'node_modules/expo-router')];

module.exports = config;
