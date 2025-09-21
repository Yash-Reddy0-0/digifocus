import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

const copyExtensionFiles = () => {
  return {
    name: 'copy-extension-files',
    writeBundle() {
      const manifestPath = resolve(__dirname, '../manifest.json');
      const backgroundPath = resolve(__dirname, '../background.js');
      const blockedPath = resolve(__dirname, '../blocked.html');
      const distDir = resolve(__dirname, '../dist');

      copyFileSync(manifestPath, resolve(distDir, 'manifest.json'));
      copyFileSync(backgroundPath, resolve(distDir, 'background.js'));
      copyFileSync(blockedPath, resolve(distDir, 'blocked.html'));
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    copyExtensionFiles(),
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },
});