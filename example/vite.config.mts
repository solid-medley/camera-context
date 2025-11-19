import { gitHubSpaConfig } from "@quick-vite/gh-pages-spa/config";
import solid from 'vite-plugin-solid'
import basicSsl from '@vitejs/plugin-basic-ssl'

import packageJson from './package.json' with { type: 'json' }

export default gitHubSpaConfig(packageJson, {
  plugins: [
    solid(),
    basicSsl()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'app': [
            'solid-js',
            'solid-js/web',
            'solid-js/jsx-runtime',
            '@solidjs/router',
            '@quick-vite/gh-pages-spa/solidjs'
          ]
        }
      }
    },
    target: 'esnext',
    sourcemap: 'inline'
  }
})