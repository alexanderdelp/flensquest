import { describe, expect, it } from 'vitest';
import { compile, formatDiagnostic, writeKladde } from '../../../src/kladde';
import { flatten, joined, toTree } from '../../../src/kladde/lines';

/** Kleinste gültige Kampagne; Tests ändern einzelne Zeilen. */
const BASE = `kampagne mini
  titel: Mini
kapitel Eins
  ort: Keller
  einleitung: Rein.
  abschluss: Raus.
  auftrag: Holen.
  ziel: bergen Schatz 💰
  belohnung: 5
  plan:
    ########
    #SSSS.G#
    #X.....#
    ########
`;

const errorsOf = (src: string) => compile(src).errors.map(formatDiagnostic);

describe('Zeilen und Einrückung', () => {
  it('baut einen Baum, Kommentare und Leerzeilen fallen weg', () => {
    const t = toTree('a\n  -- Kommentar\n  b\n\n    c\n  d\ne');
    expect(t.map((n) => n.text)).toEqual(['a', 'e']);
    expect(t[0].children.map((n) => n.text)).toEqual(['b', 'd']);
    expect(flatten(t[0]).map((n) => n.line)).toEqual([3, 5, 6]);
    expect(joined('x', t[0].children[0])).toBe('x c');
  });
});

describe('Übersetzen', () => {
  it('kleinste Kampagne', () => {
    const r = compile(BASE);
    expect(r.errors).toEqual([]);
    expect(r.campaign).toMatchObject({ id: 'mini', title: 'Mini', blurb: '', cards: [], idle: [] });
    expect(r.campaign!.chapters[0]).toMatchObject({ title: 'Eins', place: 'Keller', reward: 5, goal: { type: 'bergen', item: 'Schatz', icon: '💰' } });
    expect(r.warnings.map(formatDiagnostic)).toEqual(['Zeile 1: Hinweis: Keine Spielleiterkarten: Der Spielleiter spielt nur mit seinen Gegnern.']);
  });

  it('Texte über mehrere Zeilen, Schlüssel mit und ohne Umlaut', () => {
    const src = BASE.replace('  einleitung: Rein.', '  einleitung: Rein\n    und weiter.\n  ueberleitung: Dann.');
    expect(compile(src).campaign!.chapters[0]).toMatchObject({ intro: 'Rein und weiter.', bridge: 'Dann.' });
  });

  it('Ziele: bergen mit Bild und Endgegner, besiegen mit Gegenstand', () => {
    const a = compile(BASE.replace('ziel: bergen Schatz 💰', 'ziel: bergen Alter Schatz 💰 bild karte endgegner ratte')
      .replace('#SSSS.G#', '#SSSSaG#'));
    expect(a.campaign!.chapters[0].goal).toEqual({ type: 'bergen', item: 'Alter Schatz', icon: '💰', sprite: 'karte', boss: 'ratte' });
    const b = compile(BASE.replace('ziel: bergen Schatz 💰', 'ziel: besiegen klabauter gegenstand Feder 🪶 bild feder').replace('#SSSS.G#', '#SSSSKG#'));
    expect(b.campaign!.chapters[0].goal).toEqual({ type: 'besiegen', boss: 'klabauter', item: 'Feder', icon: '🪶', sprite: 'feder' });
  });

  it('Spielleiter: Karten mit Anzahl, Wirkung auch mit Umlaut, Pausensätze', () => {
    const r = compile(`${BASE}spielleiter\n  karte 2× eile: Hui | Schnell.\n  karte verstärkung: Mehr | Noch einer.\n  pause: Kaffee.\n`);
    expect(r.campaign!.cards.map((c) => c.id)).toEqual(['eile', 'eile', 'verstaerkung']);
    expect(r.campaign!.idle).toEqual(['Kaffee.']);
  });

  it('Skripte: alle Auslöser und Befehle', () => {
    const src = BASE.replace('#X.....#', '#X..D..#').replace('########\n  ', '########\n  ') + `  wenn start:
    zeige Hallo: Willkommen
      im Keller.
  wenn tür 4,2 aufgeht:
    rufe ratte 5,2
  wenn möwe auftaucht:
    öre +3
  wenn ratte halb:
    punkte -1
  wenn ziel gefunden:
    heile 2
  wenn runde 4:
    punkte +1
`;
    const r = compile(src);
    expect(r.errors).toEqual([]);
    expect(r.campaign!.chapters[0].scripts).toEqual([
      { when: { on: 'start' }, then: [{ do: 'zeige', title: 'Hallo', text: 'Willkommen im Keller.' }] },
      { when: { on: 'tuer', at: [{ x: 4, y: 2 }] }, then: [{ do: 'rufe', kind: 'ratte', at: { x: 5, y: 2 } }] },
      { when: { on: 'sieht', kind: 'moewe' }, then: [{ do: 'oere', n: 3 }] },
      { when: { on: 'halb', kind: 'ratte' }, then: [{ do: 'punkte', n: -1 }] },
      { when: { on: 'ziel' }, then: [{ do: 'heile', n: 2 }] },
      { when: { on: 'runde', n: 4 }, then: [{ do: 'punkte', n: 1 }] },
    ]);
    expect(r.warnings.map((w) => w.message)).toContain('„moewe“ taucht in diesem Kapitel nie auf.');
  });
});

describe('Fehlermeldungen mit Zeile', () => {
  it.each([
    ['eingerückter Block', '  titel: X', 'Zeile 1: Blöcke (kampagne, spielleiter, kapitel) beginnen ganz links.'],
    ['ohne Kampagne', 'kapitel X', 'Zeile 1: Es fehlt der Block „kampagne <kennung>“.'],
    ['unbekannter Block', `${BASE}abenteuer x\n`, 'Zeile 15: Unbekannter Block „abenteuer“. Möglich: kampagne, spielleiter, kapitel.'],
    ['schlechte Kennung', BASE.replace('kampagne mini', 'kampagne Mini Kampagne'), 'Zeile 1: Kennung der Kampagne in Kleinbuchstaben, Ziffern und Bindestrich: kampagne meine-kampagne'],
    ['fehlendes Feld', BASE.replace('  belohnung: 5\n', ''), 'Zeile 3: Im Kapitel „Eins“ fehlt „belohnung:“.'],
    ['unbekannter Gegner', `${BASE}  wenn ratze auftaucht:\n    öre +1\n`, 'Zeile 15: Unbekannter Gegner „ratze“.'],
    ['unbekannter Befehl', `${BASE}  wenn start:\n    tanze\n`, 'Zeile 16: Unbekannter Befehl „tanze“. Möglich: zeige, rufe, öre, punkte, heile.'],
    ['Tür ohne Tür', `${BASE}  wenn tür 2,2 aufgeht:\n    öre +1\n`, 'Zeile 15: Bei 2,2 ist keine Tür (D oder H), sondern „.“.'],
    ['schiefer Plan', BASE.replace('#X.....#', '#X....#'), 'Zeile 13: Planzeile 3 ist 7 Zeichen breit, die erste 8.'],
    ['unbekanntes Zeichen', BASE.replace('#X.....#', '#X..?..#'), 'Zeile 13: Unbekanntes Zeichen „?“ bei 4,2.'],
    ['zu wenig Starts', BASE.replace('#SSSS.G#', '#SS...G#'), 'Zeile 10: Der Plan braucht mindestens 4 Startfelder S, hat 2.'],
    ['Ausgang fehlt', BASE.replace('#X.....#', '#......#'), 'Zeile 8: Ziel „bergen“ braucht einen Ausgang X im Plan.'],
    ['unerreichbar', BASE.replace('#SSSS.G#', '#SSSS#G#').replace('#X.....#', '#X...###'), 'Zeile 8: Der Ziel-Gegenstand bei 6,1 ist von den Startfeldern aus nicht erreichbar.'],
    ['Endgegner fehlt', BASE.replace('ziel: bergen Schatz 💰', 'ziel: besiegen klabauter'), 'Zeile 8: Endgegner „klabauter“ steht weder im Plan noch wird er gerufen.'],
    ['falsche Karte', `${BASE}spielleiter\n  karte zaubern: A | B\n`, 'Zeile 16: Unbekannte Kartenwirkung „zaubern“. Möglich: klau, eile, flicken, zorn, schiet, schlick, verstaerkung, falle, knoellchen.'],
    ['HTML', BASE.replace('Rein.', '<b>Rein</b>'), 'Zeile 5: Spitze Klammern < > sind in Kladde-Texten nicht erlaubt.'],
  ])('%s', (_, src, message) => {
    expect(errorsOf(src)).toContain(message);
    expect(compile(src).campaign).toBeNull();
  });
});

describe('Zurückschreiben', () => {
  it('Übersetzen, Schreiben und erneut Übersetzen ergibt dieselbe Kampagne', () => {
    const long = 'Ein sehr langer Text, '.repeat(12).trim();
    const src = `${BASE.replace('Rein.', long)}spielleiter\n  karte 2× eile: Hui | Schnell.\n  karte klau: Weg | Brötchen.\n  pause: Kaffee.\n  wenn start:\n    zeige A: B\n`
      .replace('spielleiter\n  karte', 'spielleiter\n  karte');
    const first = compile(src.replace('  wenn start:\n    zeige A: B\n', '') + '');
    const text = writeKladde(first.campaign!);
    expect(text.split('\n').every((l) => l.length <= 110)).toBe(true);
    expect(text).toContain('karte 2× eile: Hui | Schnell.');
    expect(compile(text).campaign).toEqual(first.campaign);
  });
});
