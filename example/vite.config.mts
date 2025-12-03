import { gitHubSpaConfig } from "@quick-vite/gh-pages-spa/config";
import { solidVendorChunks } from "@quick-vite/gh-pages-spa/solidjs/vite";
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
        manualChunks: solidVendorChunks
      }
    },
    target: 'esnext',
    sourcemap: 'inline'
  }
})