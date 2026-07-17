import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    resolve: {
        preserveSymlinks: true
    },
    plugins: [react()],
    build: {
        outDir: fileURLToPath(new URL('../docs', import.meta.url)),
        emptyOutDir: true
    }
});
