import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// The AS Travel app: a Vue 3 SPA built by Vite to dist/ (index.html + hashed
// assets under /assets/), served by server.mjs. public/ is copied verbatim
// (manifest, icons, the service worker). VITE_* variables are fixed at build time.
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { host: 'localhost', port: 5175 },
});
