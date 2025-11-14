import path from 'node:path'

import { defineConfig } from 'tsup'

export default defineConfig({
	entry: [
		// Include all files because we're not bundling
		'src/**/*.ts',
		'src/**/*.tsx',
		// Exclude the tests, we don't need those compiled
		'!src/**/__tests__/**',
		'!src/**/*.test.*',
		'!src/**/*.spec.*',
	],
	format: ['esm'],
	// Declaration file generating doesn't work, sourcemap is good enough
	dts: true,
	clean: true,
	sourcemap: true,
	// Skip bundling node modules since we expect the consumer to install them.
	skipNodeModulesBundle: true,
	tsconfig: path.resolve(__dirname, '../tsconfig.lib.json'),
	bundle: true,
	treeshake: true,
	splitting: true,
	minify: false,
	esbuildOptions(options) {
		options.outbase = './src'
	},
})
