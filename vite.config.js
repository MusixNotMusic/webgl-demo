import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import glsl from 'vite-plugin-glsl';
import requireTransform from 'vite-plugin-require-transform';

export default defineConfig({
  plugins: [vue(), glsl(
    {
      include: [              
        '**/*.glsl', '**/*.wgsl',
        '**/*.vert', '**/*.frag',
        '**/*.vs', '**/*.fs'
      ]
    },
    requireTransform({
      fileRegex: /.js$|.jsx$/  // 使用正则表达式匹配需要作用的文件
    }),
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
    watch: {
      usePolling: true,   // 修复HMR热更新失效
    }
  },

})
