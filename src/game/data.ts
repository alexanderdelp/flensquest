export type HeroId = 'frauke' | 'joern' | 'maren' | 'hinnerk' | 'juni';
export type MonsterId = 'moewe' | 'knoellchen' | 'rumgeist' | 'qualle' | 'klabauter' | 'obermeister' | 'ratte' | 'schmuggler' | 'krabbe';

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  icon: string;
  color: string;
  hp: number;
  att: number;
  arm: number;
  spd: number;
  dmg: number;
  range: number;
  weapon: string;
  special: string;
  specialText: string;
}

export const HEROES: Record<HeroId, HeroDef> = {
  frauke: {
    id: 'frauke', name: 'Frauke', title: 'Fördefischerin', icon: '🎣', color: '#2f7f93',
    hp: 10, att: 2, arm: 1, spd: 4, dmg: 2, range: 2, weapon: 'Harpune',
    special: 'FlensNetz', specialText: 'Fesselt einen Gegner bis 3 Felder weit: 1 Schaden, setzt eine Runde aus.',
  },
  joern: {
    id: 'joern', name: 'Jörn', title: 'Werftschlosser', icon: '🔧', color: '#b5532f',
    hp: 13, att: 3, arm: 2, spd: 3, dmg: 3, range: 1, weapon: 'Rohrzange',
    special: 'Dicker Schlüssel', specialText: 'Ein Schlag gegen einen Nachbarn: Treffer sicher, 4 Schaden.',
  },
  maren: {
    id: 'maren', name: 'Maren', title: 'Möwenflüsterin', icon: '🪶', color: '#7a5aa6',
    hp: 8, att: 1, arm: 0, spd: 5, dmg: 2, range: 4, weapon: 'Möwenpfiff',
    special: 'Schwarm über der Förde', specialText: 'Alle sichtbaren Gegner bis 3 Felder weit nehmen 1 Schaden.',
  },
  hinnerk: {
    id: 'hinnerk', name: 'Hinnerk', title: 'Rumkontorist', icon: '🥃', color: '#a9791f',
    hp: 10, att: 2, arm: 1, spd: 4, dmg: 2, range: 1, weapon: 'Kontorstock',
    special: 'Lütt un Lütt', specialText: 'Heilt den am schwersten getroffenen Nachbarn (oder dich) um 4, holt auch Gestürzte zurück.',
  },
  juni: {
    id: 'juni', name: 'Juni', title: 'Leuchtturmwärterin', icon: '🏮', color: '#2f6fd6',
    hp: 9, att: 2, arm: 1, spd: 5, dmg: 2, range: 3, weapon: 'Leuchtpistole',
    special: 'FlensLeuchtfeuer', specialText: 'Blendet alle sichtbaren Gegner bis 3 Felder weit: Sie setzen eine Runde aus.',
  },
};

export interface MonsterDef {
  id: MonsterId;
  name: string;
  icon: string;
  hp: number;
  att: number;
  arm: number;
  spd: number;
  dmg: number;
  range: number;
  reward: number;
}

export const MONSTERS: Record<MonsterId, MonsterDef> = {
  moewe: { id: 'moewe', name: 'Pommes-Möwe', icon: '🐦', hp: 2, att: 1, arm: 0, spd: 5, dmg: 1, range: 1, reward: 3 },
  knoellchen: { id: 'knoellchen', name: 'Knöllchenkobold', icon: '🧾', hp: 3, att: 2, arm: 1, spd: 3, dmg: 1, range: 1, reward: 5 },
  rumgeist: { id: 'rumgeist', name: 'Rumgeist', icon: '👻', hp: 4, att: 3, arm: 2, spd: 3, dmg: 2, range: 1, reward: 8 },
  qualle: { id: 'qualle', name: 'Förde-Qualle', icon: '🦑', hp: 6, att: 2, arm: 0, spd: 2, dmg: 2, range: 1, reward: 6 },
  ratte: { id: 'ratte', name: 'Hafenratte', icon: '🐀', hp: 1, att: 1, arm: 0, spd: 6, dmg: 1, range: 1, reward: 2 },
  schmuggler: { id: 'schmuggler', name: 'Rumschmuggler', icon: '🍾', hp: 4, att: 2, arm: 1, spd: 3, dmg: 1, range: 3, reward: 7 },
  krabbe: { id: 'krabbe', name: 'Panzerkrabbe', icon: '🦀', hp: 5, att: 2, arm: 3, spd: 2, dmg: 2, range: 1, reward: 8 },
  klabauter: { id: 'klabauter', name: 'Klabauter', icon: '😈', hp: 7, att: 3, arm: 2, spd: 4, dmg: 2, range: 1, reward: 20 },
  obermeister: { id: 'obermeister', name: 'Oberpunktezähler', icon: '👔', hp: 16, att: 5, arm: 3, spd: 3, dmg: 3, range: 3, reward: 60 },
};

export const MONSTER_CHARS: Record<string, MonsterId> = {
  m: 'moewe', k: 'knoellchen', r: 'rumgeist', q: 'qualle', K: 'klabauter', B: 'obermeister',
  a: 'ratte', s: 'schmuggler', c: 'krabbe',
};

export interface ShopItem {
  id: 'friesennerz' | 'bootshaken' | 'gummistiefel' | 'fischbroetchen' | 'katzenohren';
  name: string;
  icon: string;
  price: number;
  text: string;
  once: boolean;
}

export const SHOP: ShopItem[] = [
  { id: 'fischbroetchen', name: 'Fischbrötchen', icon: '🥪', price: 15, text: 'Heilt 4 Lebenspunkte', once: false },
  { id: 'friesennerz', name: 'Friesennerz', icon: '🧥', price: 60, text: '+1 Rüstung', once: true },
  { id: 'bootshaken', name: 'Bootshaken', icon: '🪝', price: 60, text: '+1 Angriff', once: true },
  { id: 'gummistiefel', name: 'Gummistiefel', icon: '🥾', price: 45, text: '+1 Schritt je Tide', once: true },
  { id: 'katzenohren', name: 'Katzenohren', icon: '🐾', price: 70, text: 'Einmal je Kapitel landest du auf den Pfoten: Statt zu stürzen bleibt 1 Lebenspunkt', once: true },
];

export type Goal = { type: 'bergen'; item: string; icon: string } | { type: 'besiegen' };

export interface Chapter {
  title: string;
  place: string;
  intro: string;
  outro: string;
  goalText: string;
  goal: Goal;
  reward: number;
  map: string[];
}

/*
 Kartenzeichen: # Wand, . Boden, D Tür, H verborgene Tür, S Start, X Ausgang,
 T Truhe, t Falle, G Ziel-Gegenstand, f Fass, x Kiste, Kleinbuchstaben/K/B siehe MONSTER_CHARS.
*/
export const CHAPTERS: Chapter[] = [
  {
    title: 'Moin an der Hafenspitze',
    place: 'Hafenspitze',
    intro: 'Über Nacht ist das Flensburger Hafenlogbuch verschwunden. Ohne Logbuch darf kein Museumssegler auslegen. Spuren führen in die Keller am Kai. Es riecht nach Pommes und Ärger.',
    outro: 'Das Logbuch ist wieder da. Darin steht ein einziger Eintrag in Stempelschrift: „Ein Punkt." Das war erst der Anfang.',
    goalText: 'Finde das FlensLogbuch 📖 und bring es zum Ausgang 🚪.',
    goal: { type: 'bergen', item: 'FlensLogbuch', icon: '📖' },
    reward: 30,
    map: [
      '########################',
      '#SS..#f...x#......#..T.#',
      '#SS..D..m..D..k...D....#',
      '#....#.....#...s..#...f#',
      '###D####D#####D#####D###',
      '#................a.....#',
      '#........a.............#',
      '###D######D####D####H###',
      '#T...#......#.....#....#',
      '#.t..#..k...#..m..#..G.#',
      '#....D......D.....D..r.#',
      '#x...#...c..#.....#....#',
      '#..X.#..T...#...f.#.T..#',
      '########################',
    ],
  },
  {
    title: 'Rum in der Roten Straße',
    place: 'Rote Straße',
    intro: 'In den Höfen der Roten Straße lagert seit Jahrhunderten Rum. Neuerdings lagert dort auch ein Klabauter, der jede Flasche „beschlagnahmt". Hinnerk ist persönlich beleidigt.',
    outro: 'Der Klabauter ist vertrieben, zurück bleibt ein Bußgeldbescheid mit dem Absender „Unterm Nordertor". Wer schreibt so etwas?',
    goalText: 'Besiege den Klabauter 😈.',
    goal: { type: 'besiegen' },
    reward: 40,
    map: [
      '########################',
      '#.T.#.f....#......#..T.#',
      '#...#..r...#..m.s.#....#',
      '#...D......D......D..k.#',
      '#####..m...###D####....#',
      '#SS.#......#.....x###D##',
      '#SS.D......#...m..#....#',
      '#...#####D##......#.t..#',
      '#.t.#.....x#..c...D...f#',
      '#...#..k...###D####....#',
      '##D##...a..#......##D###',
      '#...D..t...D..k...#....#',
      '#T..#.f....#...s..D.K..#',
      '########################',
    ],
  },
  {
    title: 'Unterm Nordertor',
    place: 'Nordertor',
    intro: 'Unter dem alten Stadttor liegt ein Gewölbe, das auf keinem Plan steht. Dort soll der Schlüssel zum Museumsberg hängen. Die Wände haben Nischen. Manche sind Türen. Suchen lohnt sich!',
    outro: 'Der Schlüssel passt. Auf dem Anhänger steht: „Bitte nach Gebrauch abstempeln lassen."',
    goalText: 'Hole den FlensSchlüssel 🗝️ und bring ihn zum Ausgang 🚪. Tipp: verborgene Türen findest du mit „Suchen".',
    goal: { type: 'bergen', item: 'FlensSchlüssel', icon: '🗝️' },
    reward: 45,
    map: [
      '########################',
      '#SS.#f......#.....s.#T.#',
      '#SS.D...k...D..r....H..#',
      '#...#....a.x#......f#..#',
      '#...###D#####.t.#####D##',
      '#...#.....#..c..#.....f#',
      '##D##..q..D..m..D..k...#',
      '#...#.....#x....#....a.#',
      '#.t.###D#####D###.m....#',
      '#...#x......#...###D####',
      '#.T.D..r....#.t.#......#',
      '#####...t...H...D...G..#',
      '#X..D....s..#...#..r..f#',
      '########################',
    ],
  },
  {
    title: 'Museumsberg bei Nacht',
    place: 'Museumsberg',
    intro: 'Nachts wachen die Gemälde auf dem Museumsberg nicht auf, aber die Rumgeister gehen um. Im Depot liegt die FlensKarte, die den Weg ins geheime Punktearchiv zeigt.',
    outro: 'Die Karte zeigt nur einen Punkt, und der liegt mitten in Flensburg, tief unter einem sehr nüchternen Amtsgebäude.',
    goalText: 'Hole die FlensKarte 🗺️ aus dem Depot und flieh zum Ausgang 🚪.',
    goal: { type: 'bergen', item: 'FlensKarte', icon: '🗺️' },
    reward: 55,
    map: [
      '########################',
      '#.G..#x....D.....#..T.x#',
      '#.r..#..r..#..k..D..r..#',
      '#....D.....#..s..#.....#',
      '#.K.x#..c..#....f#.....#',
      '###D###D#####D#####D####',
      '#...a.......t..........#',
      '#.......m........m.a...#',
      '###D#####D####D######D##',
      '#.Ts.#.....#....x#.....#',
      '#....#..k..D..q..D..t..#',
      '#.r..D.....#.....#.....#',
      '#f...#..SS.#..X..#..T.f#',
      '########SS##############',
    ],
  },
  {
    title: 'Das Punktearchiv',
    place: 'Punktearchiv',
    intro: 'Karteikästen bis zur Decke. Hier sitzt der Oberpunktezähler und sammelt seit Jahrzehnten Punkte in Flensburg. Heute will er eure. Acht Stück, dann ist der Lappen weg, und zwar für die ganze Förde.',
    outro: 'Der Oberpunktezähler stempelt ein letztes Mal, dann hört man nur noch die Möwen. Flensburg atmet auf. Moin!',
    goalText: 'Besiege den Oberpunktezähler 👔.',
    goal: { type: 'besiegen' },
    reward: 100,
    map: [
      '########################',
      '#SS.D....k.#.t....#..T.#',
      '#SS.#....a.D...r..D....#',
      '#...#x.m...#....f.#.k..#',
      '##D###D######D#####D####',
      '#.....#x.........s.#...#',
      '#..r..D....q...t...D.T.#',
      '#x....#...c.......f#...#',
      '##D###D######D#####D####',
      '#...#.f....#...s..#.a..#',
      '#.t.D..K...D..r...D..m.#',
      '#...#......###D####....#',
      '#.T.#ft....#B.....D..rx#',
      '########################',
    ],
  },
];

export interface EventCard {
  id: 'nix' | 'schiet' | 'klau' | 'knoellchen' | 'verstaerkung' | 'moin';
  name: string;
  text: string;
}

export const EVENTS: EventCard[] = [
  { id: 'nix', name: 'Flaute', text: 'Nichts passiert. Der Oberpunktezähler rührt in seinem Kaffee.' },
  { id: 'nix', name: 'Mittagspause', text: 'Das Amt hat geschlossen.' },
  { id: 'moin', name: 'Moin!', text: 'Ein freundlicher Gruß vom Kai: alle heilen 1 Lebenspunkt.' },
  { id: 'schiet', name: 'Schietwetter', text: 'Waagerechter Regen: jede Heldin und jeder Held nimmt 1 Schaden, außer mit Friesennerz.' },
  { id: 'klau', name: 'Möwenklau', text: 'Eine Möwe stiehlt ein Fischbrötchen.' },
  { id: 'knoellchen', name: 'Falsch geparkt', text: 'Das Boot stand im Halteverbot: 1 Punkt in Flensburg.' },
  { id: 'verstaerkung', name: 'Amtshilfe', text: 'Ein Knöllchenkobold taucht auf.' },
];

export const PUNKTE_LIMIT = 8;
export const TIDEN = 3;
