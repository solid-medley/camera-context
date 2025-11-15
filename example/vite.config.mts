import { gitHubSpaConfig } from "@quick-vite/gh-pages-spa/config";
import solid from 'vite-plugin-solid'

import packageJson from './package.json' with { type: 'json' }

export default gitHubSpaConfig(packageJson, {
  plugins: [
    solid()
  ],
  build: {
    rollupOptions: {
      output: {
        // At least bundle solid-js/web so the iframe doesn't render the main page
        manualChunks: {
          'solid': [
            'solid-js',
            'solid-js/web',
            'solid-js/jsx-runtime'
          ]
        }
      }
    },
    target: 'esnext',
    sourcemap: 'inline'
  }
})