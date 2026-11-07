import { AKTE_CHAPTERS, AKTE_EPILOG, AKTE_EVENTS, AKTE_INTRO, AKTE_LOST, AKTE_RETRY } from './akte';
import { CHAPTERS, EVENTS, type Chapter, type EventCard } from './data';

/** Eine Kampagne bündelt Kapitel, Ereigniskarten und ihre Rahmentexte. */
export interface CampaignDef {
  id: string;
  title: string;
  blurb: string;
  chapters: Chapter[];
  events: EventCard[];
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
    blurb: 'Fünf Kapitel von der Hafenspitze bis ins Punktearchiv. Der ursprüngliche Einstieg in FlensQuest.',
    chapters: CHAPTERS,
    events: EVENTS,
  },
  {
    id: 'akte',
    title: 'Die Akte Förde',
    blurb: 'Das Geheimnis der verschwundenen Punkte: Sechs Missionen quer durch Flensburg, mit Fälschern, Möwenbanden und einem Oberarchivar.',
    chapters: AKTE_CHAPTERS,
    events: AKTE_EVENTS,
    intro: AKTE_INTRO,
    epilog: AKTE_EPILOG,
    lostText: AKTE_LOST,
    retryText: AKTE_RETRY,
  },
];

/** Alte Spielstände kennen keine Kampagne und gehören zur ersten. */
export const campaignById = (id?: string) => CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0];
