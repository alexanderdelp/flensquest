/* Übergang: bündelt Kern-Module unter den alten Namen, damit die bisherigen Tests als Gleichheitsprobe laufen. */
import { registerBuiltins } from '../../src/campaigns';
export * from '../../src/core';
export * from '../../src/core/state';
export * from '../../src/core/map';
export * from '../../src/core/heroes';
export * from '../../src/core/combat';
export * from '../../src/core/outcome';
export * from '../../src/core/gm/cards';
export * from '../../src/core/gm/ai';
export * from '../../src/core/gm/turn';
export { newProgress as newCampaign } from '../../src/core/progress';
export { look as reveal } from '../../src/core/scripts';
export { SHOP } from '../../src/content';
registerBuiltins();
