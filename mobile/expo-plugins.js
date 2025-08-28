// expo-plugins.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withVectorIcons(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
        'fonts'
      );
      
      // Ensure the fonts directory exists
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
      
      return config;
    },
  ]);
};