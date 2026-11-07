import { AKTE_CARDS, AKTE_CHAPTERS, AKTE_EPILOG, AKTE_IDLE, AKTE_INTRO, AKTE_LOST, AKTE_RETRY } from './akte';
import { CHAPTERS, GM_CARDS, GM_IDLE, type Chapter, type GmCard } from './data';

/** Eine Kampagne bündelt Kapitel, Spielleiterkarten und ihre Rahmentexte. */
export interface CampaignDef {
  id: string;
  title: string;
  blurb: string;
  /** Auswahlbild in public/img. */
  image: string;
  chapters: Chapter[];
  /** Stapel des Spielleiters; Doppelte sind gewollt. */
  cards: GmCard[];
  /** Sätze, wenn der Rechner keine Karte spielt. */
  idle: string[];
  /** Einleitung vor dem ersten Kapitel. */
  intro?: string;
  /** Abschluss nach dem letzten Kapitel; ohne ihn genügt der Text des letzten Kapitels. */
  epilog?: string;
  lostText?: string;
  retryText?: string;
}

export const CAMPAIGNS: CampaignDef[] = [
  {
    id: 'hafen',
    title: 'Der Fall Hafenlogbuch',
    image: 'img/kampagne-hafen.webp',
    blurb: 'Fünf Kapitel von der Hafenspitze bis ins Punktearchiv. Der ursprüngliche Einstieg in FlensQuest.',
    chapters: CHAPTERS,
    cards: GM_CARDS,
    idle: GM_IDLE,
  },
  {
    id: 'akte',
    title: 'Die Akte Förde',
    image: 'img/kampagne-akte.webp',
    blurb: 'Das Geheimnis der verschwundenen Punkte: Sechs Missionen quer durch Flensburg, mit Fälschern, Möwenbanden und einem Oberarchivar.',
    chapters: AKTE_CHAPTERS,
    cards: AKTE_CARDS,
    idle: AKTE_IDLE,
    intro: AKTE_INTRO,
    epilog: AKTE_EPILOG,
    lostText: AKTE_LOST,
    retryText: AKTE_RETRY,
  },
];

/** Alte Spielstände kennen keine Kampagne und gehören zur ersten. */
export const campaignById = (id?: string) => CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0];
