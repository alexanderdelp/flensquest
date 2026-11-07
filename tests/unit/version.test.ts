import { describe, expect, it } from 'vitest';
import changelog from '../../CHANGELOG.md?raw';
import pkg from '../../package.json' with { type: 'json' };
import { VERSION, versionLabel } from '../../src/version';

describe('Version', () => {
  it('folgt major.minor.build', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('kommt beim Bauen aus package.json', () => {
    expect(VERSION).toBe(pkg.version);
    expect(versionLabel()).toBe(`Version ${pkg.version}`);
  });

  it('der oberste Eintrag im Changelog passt zur Version', () => {
    const top = changelog.match(/^## (\S+)/m)?.[1];
    expect(top).toBe(pkg.version);
  });
});
