// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'design/*', 'server/dist/*', 'server/node_modules/*', 'mcp-server/dist/*', 'mcp-server/node_modules/*'],
  },
]);
