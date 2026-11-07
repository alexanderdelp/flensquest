/** Meldungen beim Übersetzen einer Kladde. Fehler verhindern das Laden, Hinweise nicht. */
export interface Diagnostic {
  line: number;
  severity: 'fehler' | 'hinweis';
  message: string;
}

export class Report {
  readonly items: Diagnostic[] = [];
  error(line: number, message: string) { this.items.push({ line, severity: 'fehler', message }); }
  warn(line: number, message: string) { this.items.push({ line, severity: 'hinweis', message }); }
  get errors() { return this.items.filter((d) => d.severity === 'fehler'); }
  get warnings() { return this.items.filter((d) => d.severity === 'hinweis'); }
}

/** Lesbare Zeile wie „Zeile 12: Unbekannter Gegner „ratze“.“ */
export const formatDiagnostic = (d: Diagnostic) =>
  `${d.line ? `Zeile ${d.line}: ` : ''}${d.severity === 'hinweis' ? 'Hinweis: ' : ''}${d.message}`;
