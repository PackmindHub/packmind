import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/packmind-ui',
  assetsInclude: ['**/*.svg', '**/*.png'],
  plugins: [
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    tsconfigPaths(),
  ],
  build: {
    outDir: '../../dist/packages/packmind-ui',
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      entry: 'src/index.ts',
      name: 'packmind-ui',
      fileName: 'index',
      formats: ['es' as const],
    },
    rolldownOptions: {
      // Keep external anything that isn't a relative/absolute/virtual module id,
      // so consumers' own dependencies aren't bundled into the library.
      external: (id: string) =>
        !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
    },
  },
}));
