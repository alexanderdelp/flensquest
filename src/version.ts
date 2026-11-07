declare const __APP_VERSION__: string;

/**
 * Version major.minor.build aus package.json, beim Bauen eingesetzt.
 * major: große Umbrüche, minor: neue Funktionen, build: jede sonstige Änderung.
 */
export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export const versionLabel = (v = VERSION) => `Version ${v}`;
