

import bowser, { type Parser } from 'bowser'

export type BrowserMetadata = Parser.ParsedResult;
let meta: BrowserMetadata | undefined;

export const getBrowserMetadata = () => {
	if (meta) return meta;
	meta = bowser.parse(window.navigator.userAgent)
	if (import.meta.env.DEV) {
		console.debug('browser', meta)
	}
	return meta;
}