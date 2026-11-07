/*
 Öffentliche Schnittstelle des Regelkerns. Oberfläche, Netz und Werkzeuge importieren nur von hier.
 Der Kern greift nie auf DOM, Speicher oder Netz zu; Zufall kommt aus dem Spielstand.
*/
export type * from './types';
export { registerCampaign, unregisterCampaign, campaigns, campaignById, hasCampaign } from './catalog';
export { type Action, dispatch } from './actions';
export { newProgress, startChapter, finishChapter, buy } from './progress';
export { gmTurn, gmCanAct, gmReachable } from './gm/turn';
export { gmTargets } from './gm/ai';
export { canPlayCard } from './gm/cards';
export {
  reachable, stepsLeft, tideCost, canOpenDoor, canOpenChest, canSpecial, canSpecialOn, specialNeedsTarget,
} from './heroes';
export { canAttack, type Roll } from './combat';
export { lineOfSight, walkable } from './map';
export { SPECIALS } from './specials';
export { foeNote } from './scripts';
export {
  activeHero, living, chapterOf, campaignOf, cardOf, costOf, spdOf, tile, monsterAt, heroAt, chestAt, propAt,
  isActive, dist, hkey, mkey,
} from './state';
