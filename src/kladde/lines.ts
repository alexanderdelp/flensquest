/*
 Erste Stufe der Kladde: Text in Zeilen und Einrückungsbaum. Kommentare beginnen mit `--`
 am Zeilenanfang (nach Leerzeichen). Was tiefer eingerückt ist als eine Zeile, gehört zu ihr.
*/

export interface Node {
  /** Zeilennummer ab 1, für Fehlermeldungen. */
  line: number;
  indent: number;
  text: string;
  children: Node[];
}

export function toTree(source: string): Node[] {
  const root: Node = { line: 0, indent: -1, text: '', children: [] };
  const stack: Node[] = [root];
  source.replace(/^﻿/, '').split(/\r?\n/).forEach((raw, i) => {
    const expanded = raw.replace(/\t/g, '  ');
    const text = expanded.trim();
    if (!text || text.startsWith('--')) return;
    const indent = expanded.length - expanded.trimStart().length;
    const node: Node = { line: i + 1, indent, text, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  return root.children;
}

/** Alle Zeilen unter einem Knoten, flach und in Reihenfolge, mit ihrer Einrückung. */
export function flatten(n: Node): Node[] {
  return n.children.flatMap((c) => [c, ...flatten(c)]);
}

/** Text eines Knotens samt eingerückter Fortsetzungszeilen, mit Leerzeichen verbunden. */
export function joined(first: string, n: Node): string {
  return [first, ...flatten(n).map((c) => c.text)].filter(Boolean).join(' ').trim();
}
