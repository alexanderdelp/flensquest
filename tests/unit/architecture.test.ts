import { describe, expect, it } from 'vitest';

/*
 Modulgrenzen. Jede Schicht darf nur nach unten greifen:
   content  → nichts
   core     → content
   kladde   → core, content
   campaigns→ kladde, core, content
   net      → core, content
   platform → core (nur Typen)
   ui       → alles außer main
 Der Kern greift nie auf DOM, Speicher oder Netz zu.
*/

const files = import.meta.glob('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const layer = (path: string) => path.replace('../../src/', '').split('/')[0].replace(/\.ts$/, '');
const imports = (src: string) => [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);

/** Auf welche Schicht ein relativer Import aus einer Datei zeigt. */
function target(from: string, spec: string) {
  if (!spec.startsWith('.')) return `npm:${spec}`;
  const parts = from.replace('../../src/', '').split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts[0]?.replace(/\.ts$/, '') ?? '';
}

const ALLOWED: Record<string, string[]> = {
  content: ['content'],
  core: ['core', 'content'],
  kladde: ['kladde', 'core', 'content'],
  campaigns: ['campaigns', 'kladde', 'core', 'content'],
  net: ['net', 'core', 'content'],
  platform: ['platform', 'core'],
  version: [],
};

describe('Modulgrenzen', () => {
  for (const [path, src] of Object.entries(files)) {
    const from = layer(path);
    if (!(from in ALLOWED)) continue;
    it(`${path.replace('../../src/', '')} greift nur auf erlaubte Schichten zu`, () => {
      for (const spec of imports(src)) {
        const to = target(path, spec);
        expect(ALLOWED[from], `${spec} → ${to}`).toContain(to);
      }
    });
  }

  it('der Kern nutzt weder DOM noch Speicher noch Zeit', () => {
    for (const [path, src] of Object.entries(files)) {
      if (layer(path) !== 'core' && layer(path) !== 'content') continue;
      expect(src, path).not.toMatch(/\b(document|window|localStorage|fetch|Math\.random|performance|Date)\b/);
    }
  });
});
