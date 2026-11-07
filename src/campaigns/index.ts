import { MONSTERS, type MonsterId } from '../content';
import { registerCampaign, type CampaignDef, type Chapter, type Script } from '../core';
import { AKTE_CARDS, AKTE_CHAPTERS, AKTE_EPILOG, AKTE_IDLE, AKTE_INTRO, AKTE_LOST, AKTE_RETRY } from './legacy/akte';
import { CHAPTERS, GM_CARDS, GM_IDLE } from './legacy/hafen';
import type { Chapter as LegacyChapter } from './legacy/types';

/** Übergang: altes Kapitelformat (Raumtexte, Gegnertexte, Wende) in Skripte umwandeln. */
export function fromLegacy(old: LegacyChapter): Chapter {
  const scripts: Script[] = [
    ...(old.notes ?? []).map((n): Script => ({
      when: { on: 'tuer', at: n.at.map(([x, y]) => ({ x, y })) },
      then: [{ do: 'zeige', title: n.title, text: n.text }, ...(n.spawn ?? []).map((s) => ({ do: 'rufe' as const, kind: s.kind, at: { x: s.x, y: s.y } }))],
    })),
    ...Object.entries(old.foes ?? {}).map(([kind, text]): Script => ({
      when: { on: 'sieht', kind: kind as MonsterId },
      then: [{ do: 'zeige', title: MONSTERS[kind as MonsterId].name, text: text! }],
    })),
    ...(old.phase ? [{
      when: { on: 'halb' },
      then: [{ do: 'zeige', title: old.phase.title, text: old.phase.text }, ...old.phase.spawn.map((s) => ({ do: 'rufe' as const, kind: s.kind, at: { x: s.x, y: s.y } }))],
    } as Script] : []),
  ];
  const { notes: _n, foes: _f, phase: _p, ...rest } = old;
  void _n; void _f; void _p;
  return { ...rest, scripts };
}

export const BUILTIN: CampaignDef[] = [
  {
    id: 'hafen',
    title: 'Der Fall Hafenlogbuch',
    image: 'img/kampagne-hafen.webp',
    blurb: 'Fünf Kapitel von der Hafenspitze bis ins Punktearchiv. Der ursprüngliche Einstieg in FlensQuest.',
    chapters: CHAPTERS.map(fromLegacy),
    cards: GM_CARDS,
    idle: GM_IDLE,
  },
  {
    id: 'akte',
    title: 'Die Akte Förde',
    image: 'img/kampagne-akte.webp',
    blurb: 'Das Geheimnis der verschwundenen Punkte: Sechs Missionen quer durch Flensburg, mit Fälschern, Möwenbanden und einem Oberarchivar.',
    chapters: AKTE_CHAPTERS.map(fromLegacy),
    cards: AKTE_CARDS,
    idle: AKTE_IDLE,
    intro: AKTE_INTRO,
    epilog: AKTE_EPILOG,
    lostText: AKTE_LOST,
    retryText: AKTE_RETRY,
  },
];

/** Trägt die mitgelieferten Kampagnen im Regelkern ein. */
export function registerBuiltins() { BUILTIN.forEach(registerCampaign); }
