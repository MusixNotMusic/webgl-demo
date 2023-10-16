import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [vue(), glsl(
    {
      include: [              
        '**/*.glsl', '**/*.wgsl',
        '**/*.vert', '**/*.frag',
        '**/*.vs', '**/*.fs'
      ]
    }
  )],
  build: {
    target: "esnext",
  },
  server: {
    https: false,
    // Listening on all local IPs
    host: true,
    port: 8088,
    // Load proxy configuration from .env
    proxy: 'http://192.168.20.104',
  },
})
