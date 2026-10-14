// Сборка в один файл dist/index.js (вместе с SDK и zod — для запуска нужен только Node). Код данных берётся из ../src/db; для Node подставляются
// файлы *.node.ts (база на node:sqlite, хэш на node:crypto) вместо вариантов для Expo.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  resolveExtensions: ['.node.ts', '.ts', '.js'],
  // Типы из expo-* импортируются только как type и в сборку не попадают.
  external: ['expo-*'],
  logLevel: 'warning',
});
