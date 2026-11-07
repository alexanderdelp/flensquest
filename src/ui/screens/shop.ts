import { HEROES, SHOP, type HeroId } from '../../content';
import { buy } from '../../core';
import { play } from '../audio';
import { html, LOGO, on } from '../dom';
import { save, session } from '../session';
import { heroSprite, objects, toDataUrl } from '../sprites';
import { chapterIntro } from './story';

/** Hafenkiosk zwischen den Kapiteln. */
export function shop() {
  const c = session.progress!;
  html(`<main class="screen">
    ${LOGO}
    <h2>🛒 Hafenkiosk</h2>
    <p class="lead">Kasse: <b>${c.oere} Öre</b></p>
    <div class="shop">${c.heroes.map((h) => `<section class="shelf">
      <h3><img class="dot" alt="" src="${toDataUrl(heroSprite(h.id, h.gear, 0))}"> ${HEROES[h.id].name} <small>🥪 ${h.food}</small></h3>
      ${SHOP.map((s) => {
        const owned = s.once && h.gear.includes(s.id);
        return `<button data-buy="${h.id}:${s.id}" ${owned || c.oere < s.price ? 'disabled' : ''}
          data-say="${HEROES[h.id].name}: ${s.name}. ${owned ? 'Hast du schon' : `${s.text}, ${s.price} Öre`}">
          <img class="dot" alt="" src="${toDataUrl(objects[s.id]())}"> ${s.name} <small>${owned ? 'hast du schon' : `${s.text} · ${s.price} Öre`}</small>
        </button>`;
      }).join('')}
    </section>`).join('')}</div>
    <button class="primary" data-go>Weiter zu Kapitel ${c.chapter + 1}</button>
  </main>`);
  on('[data-buy]', (el) => {
    const [id, item] = el.dataset.buy!.split(':');
    const it = SHOP.find((s) => s.id === item)!;
    if (buy(c, id as HeroId, it)) play('coin');
    save();
    shop();
  });
  on('[data-go]', chapterIntro);
}
