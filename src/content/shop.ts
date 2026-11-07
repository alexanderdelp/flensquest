/** Hafenkiosk: Ausrüstung und Proviant zwischen den Kapiteln. */

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
