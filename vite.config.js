import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), glsl()],
  server: {
    https: false,
    // Listening on all local IPs
    host: true,
    port: 8088,
    // Load proxy configuration from .env
    proxy: 'http://192.168.20.104',
  },
})
