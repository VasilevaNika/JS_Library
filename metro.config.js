// Metro: настройки только для web-превью. На iOS/Android (Expo Go) ни на что не влияют.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// sql.js (база web-превью, src/db/client.web.ts) грузит wasm-файл.
config.resolver.assetExts.push('wasm');

// В sql.js есть ветка для Node с require('node:fs'/'node:crypto') — в браузере она не выполняется.
const NODE_ONLY = new Set(['node:fs', 'node:crypto', 'fs', 'crypto', 'path']);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && NODE_ONLY.has(moduleName)) return { type: 'empty' };
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
