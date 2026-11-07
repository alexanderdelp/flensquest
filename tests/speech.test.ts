import { describe, expect, it } from 'vitest';
import { parseSettings, sentences, speechText } from '../src/ui/speech-text';

describe('Vorlesetext', () => {
  it('entfernt Markup und Emojis', () => {
    expect(speechText('<b>Ziel:</b> Finde das FlensLogbuch 📖 und bring es zum Ausgang 🚪.'))
      .toBe('Ziel: Finde das FlensLogbuch und bring es zum Ausgang.');
  });

  it('liest Angriffe ohne Würfelrechnung', () => {
    expect(speechText('Frauke → Pommes-Möwe: 🎲 6+2+2 = 10 (nötig 7) Treffer, 2 Schaden'))
      .toBe('Frauke gegen Pommes-Möwe: Treffer, 2 Schaden');
  });

  it('spricht Zeichen aus', () => {
    expect(speechText('Pommes-Möwe ist erledigt (+3 Öre).')).toContain('plus 3 Öre');
    expect(speechText('FlensNetz: noch 2×.')).toBe('FlensNetz: noch 2 mal.');
    expect(speechText('— Der Oberpunktezähler ist dran —')).toBe('Der Oberpunktezähler ist dran');
  });

  it('lässt die Würfel in Meldungen weg', () => {
    expect(speechText('Pommes-Möwe trifft Juni (3+6, nötig 8): 1 Schaden')).toBe('Pommes-Möwe trifft Juni: 1 Schaden');
  });

  it('doppelte Satzzeichen verschwinden', () => {
    expect(speechText('Wer geht mit in den Keller?. Los.. ')).toBe('Wer geht mit in den Keller? Los.');
  });

  it('teilt Text in Sätze', () => {
    expect(sentences('Moin! Das ist gut. Weiter?')).toEqual(['Moin!', 'Das ist gut.', 'Weiter?']);
    expect(sentences('🌊')).toEqual([]);
  });
});

describe('Audio-Einstellungen', () => {
  it('nutzt Vorgaben bei fehlenden oder kaputten Daten', () => {
    expect(parseSettings(null)).toEqual({ sfx: true, music: true, voice: true });
    expect(parseSettings('kaputt')).toEqual({ sfx: true, music: true, voice: true });
  });

  it('übernimmt gespeicherte Schalter', () => {
    expect(parseSettings('{"music":false,"voice":false}')).toEqual({ sfx: true, music: false, voice: false });
  });
});
