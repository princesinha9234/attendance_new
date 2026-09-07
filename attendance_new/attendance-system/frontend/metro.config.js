const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'jimp-compact': path.resolve(__dirname, 'src/utils/emptyModule.js'),
  'qrcode': path.resolve(__dirname, 'src/utils/emptyModule.js'),
  'react-native-qrcode-svg': path.resolve(__dirname, 'src/utils/emptyModule.js'),
};

module.exports = config;