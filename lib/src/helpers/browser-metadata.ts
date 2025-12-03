

import bowser, { type Parser } from 'bowser'

export type BrowserMetadata = Parser.ParsedResult & {
	platform: Parser.ParsedResult['platform'] & {
		type: 'desktop' | 'mobile' | string
	}
};
let meta: BrowserMetadata | undefined;

export const getBrowserMetadata = (): BrowserMetadata => {
	if (meta) return meta;
	meta = bowser.parse(window.navigator.userAgent) as BrowserMetadata
	if (import.meta.env.DEV) {
		console.debug('browser', meta)
	}
	return meta;
}