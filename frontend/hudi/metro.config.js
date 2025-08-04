const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure watchFolders to only watch the current directory and avoid missing paths
config.watchFolders = [__dirname];

module.exports = config;