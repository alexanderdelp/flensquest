import { describe, expect, it } from 'vitest';
import { BUILTIN_SOURCES, addOwn, builtins, checkOwn, isBuiltin, ownCampaigns, registerOwn, removeOwn, sourceOf } from '../../src/campaigns';
import { MONSTERS } from '../../src/content';
import * as E from '../../src/core';
import { compile, writeKladde } from '../../src/kladde';
import { ALL } from '../support/fixture';

/*
 Zusammenspiel: Kladde-Dateien, Übersetzer, Verzeichnis und Regelkern mit den echten Kampagnen.
*/

const start = (campaign: string, chapter: number, heroes = ALL, seed = 1) => {
  const p = E.newProgress(heroes, false, campaign);
  p.chapter = chapter;
  return E.startChapter(p, seed);
};

describe('Mitgelieferte Kampagnen', () => {
  for (const [id, src] of Object.entries(BUILTIN_SOURCES)) {
    describe(id, () => {
      const r = compile(src);

      it('übersetzt ohne Fehler und ohne Hinweise', () => {
        expect(r.errors).toEqual([]);
        expect(r.warnings).toEqual([]);
      });

      it('Zurückschreiben und erneut Übersetzen ändert nichts', () => {
        expect(compile(writeKladde(r.campaign!)).campaign).toEqual(r.campaign);
      });

      it('jedes Kapitel startet mit 1 bis 4 Figuren', () => {
        r.campaign!.chapters.forEach((ch, i) => {
          for (let n = 1; n <= 4; n++) {
            const g = start(id, i, ALL.slice(0, n));
            expect(g.heroes, ch.title).toHaveLength(n);
            expect(g.status).toBe('play');
          }
        });
      });

      it('Spielleiterkarten und Rahmentexte sind da', () => {
        expect(r.campaign!.cards.length).toBeGreaterThanOrEqual(10);
        expect(r.campaign!.idle.length).toBeGreaterThanOrEqual(1);
        expect(r.campaign!.blurb.length).toBeGreaterThan(20);
      });
    });
  }

  it('Reihenfolge in der Auswahl: zuerst der Fall Hafenlogbuch, dann die Akte Förde', () => {
    expect(builtins().map((c) => c.id)).toEqual(['hafen', 'akte']);
  });
});

describe('Die Akte Förde erzählt', () => {
  const AKTE = builtins().find((c) => c.id === 'akte')!;

  it('sechs Missionen mit allen Rahmentexten', () => {
    expect(AKTE.chapters).toHaveLength(6);
    for (const t of [AKTE.intro, AKTE.epilog, AKTE.lostText, AKTE.retryText]) expect(t?.length).toBeGreaterThan(20);
    AKTE.chapters.forEach((ch, i) => {
      for (const t of [ch.title, ch.intro, ch.situation, ch.goalText, ch.outro]) expect(t?.length).toBeGreaterThan(10);
      if (i < 5) expect(ch.bridge?.length).toBeGreaterThan(10);
      const doors = ch.scripts.filter((s) => s.when.on === 'tuer');
      expect(doors.length, ch.title).toBeGreaterThanOrEqual(3);
      expect(ch.scripts.some((s) => s.when.on === 'sieht')).toBe(true);
      expect(ch.scripts.some((s) => s.then.some((c) => c.do === 'rufe'))).toBe(true);
    });
  });

  it('Raumtexte erscheinen einmal und bringen ihre Überraschung', () => {
    const g = start('akte', 0, ['joern', 'maren']);
    const h = E.activeHero(g);
    h.x = 14; h.y = 3;
    const before = g.monsters.length;
    g.fx = [];
    expect(E.dispatch(g, { type: 'door', x: 14, y: 4 })).toBe(true);
    expect(g.fx.filter((f) => f.t === 'note' && f.title === 'Fischkisten')).toHaveLength(1);
    expect(g.monsters.length).toBe(before + 1);
  });

  it('Mission 6 hat eine Wende im Endkampf, und der Oberarchivar bleibt solo ernst zu nehmen', () => {
    const g = start('akte', 5, ['joern', 'maren']);
    const boss = g.monsters.find((m) => m.kind === 'oberarchivar')!;
    const h = E.activeHero(g);
    h.x = boss.x - 1; h.y = boss.y;
    g.seen[boss.y][boss.x] = true;
    const before = g.monsters.length;
    boss.hp = Math.ceil(boss.maxHp / 2) + 1;
    E.dispatch(g, { type: 'special', uid: boss.uid });
    expect(g.monsters.length).toBe(before + 2);
    expect(start('akte', 5, ['joern']).monsters.find((m) => m.kind === 'oberarchivar')!.maxHp)
      .toBe(Math.round(MONSTERS.oberarchivar.hp * 0.6));
  });

  it('der Spielstand läuft durch alle Missionen; eine Niederlage bleibt im Kapitel', () => {
    let c = E.newProgress(['joern', 'maren'], false, 'akte');
    for (let i = 0; i < 6; i++) {
      const lost = E.startChapter(c, i + 1);
      lost.status = 'lost';
      expect(c.chapter).toBe(i);
      const g = E.startChapter(c, i + 1);
      expect(E.chapterOf(g).title).toBe(AKTE.chapters[i].title);
      g.status = 'won';
      c = E.finishChapter(c, g);
    }
    expect(c).toMatchObject({ chapter: 6, campaign: 'akte' });
  });
});

describe('Eigene Kampagnen', () => {
  const own = (id: string, title = 'Eigen') => BUILTIN_SOURCES.hafen
    .replace('kampagne hafen', `kampagne ${id}`).replace('titel: Der Fall Hafenlogbuch', `titel: ${title}`);

  it('laden, ersetzen, entfernen; Quelltext bleibt zum Weitergeben erhalten', () => {
    let sources: string[] = [];
    ({ sources } = addOwn(own('meins'), sources));
    expect(E.hasCampaign('meins')).toBe(true);
    ({ sources } = addOwn(own('meins', 'Neu'), sources));
    expect(sources).toHaveLength(1);
    expect(E.campaignById('meins').title).toBe('Neu');
    expect(ownCampaigns().map((c) => c.id)).toContain('meins');
    expect(sourceOf('meins', sources)).toContain('titel: Neu');
    expect(sourceOf('hafen', sources)).toBe(BUILTIN_SOURCES.hafen);
    sources = removeOwn('meins', sources);
    expect(sources).toEqual([]);
    expect(E.hasCampaign('meins')).toBe(false);
  });

  it('mitgelieferte Kennungen sind geschützt, auch beim Entfernen', () => {
    expect(isBuiltin('hafen')).toBe(true);
    expect(checkOwn(BUILTIN_SOURCES.hafen).errors[0].message).toContain('gehört zu einer mitgelieferten Kampagne');
    expect(removeOwn('hafen', ['x'])).toEqual(['x']);
    expect(E.hasCampaign('hafen')).toBe(true);
  });

  it('gespeicherte Kampagnen werden beim Start eingetragen, kaputte übersprungen', () => {
    const ok = registerOwn([own('gespeichert'), 'kampagne kaputt']);
    expect(ok.map((c) => c.id)).toEqual(['gespeichert']);
    expect(E.hasCampaign('kaputt')).toBe(false);
    removeOwn('gespeichert', []);
  });

  it('eine eigene Kampagne ist spielbar wie eine mitgelieferte', () => {
    addOwn(own('spielbar'), []);
    const g = start('spielbar', 0, ['joern']);
    expect(g.campaign).toBe('spielbar');
    expect(E.dispatch(g, { type: 'end' })).toBe(true);
    removeOwn('spielbar', []);
  });
});

describe('Spielstände', () => {
  it('alte Spielstände ohne Kampagne gehören zur ersten', () => {
    const alt = { heroes: E.newProgress(['joern']).heroes, oere: 20, chapter: 1 };
    const g = E.startChapter(alt, 1);
    expect(g.campaign).toBe('hafen');
    expect(E.chapterOf(g).title).toBe(builtins()[0].chapters[1].title);
  });
});

describe('Dokumentation', () => {
  it('das Beispiel in docs/kladde.md ist eine gültige Kampagne', async () => {
    const doc = (await import('../../docs/kladde.md?raw')).default;
    const example = doc.match(/## Aufbau\n\n```\n([\s\S]*?)```/)![1];
    const r = compile(example);
    expect(r.errors).toEqual([]);
    expect(r.campaign!.chapters[0].scripts).toHaveLength(2);
  });
});
