/** Reine Texthelfer für die Oberfläche, ohne DOM. */

/** Schützt Texte aus Kampagnen vor HTML, auch in Attributen. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
