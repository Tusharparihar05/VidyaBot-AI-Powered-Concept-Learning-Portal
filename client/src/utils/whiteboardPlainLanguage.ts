/**
 * Plain-language helpers so whiteboard TTS and on-canvas text avoid reading
 * raw LaTeX, markdown, or decorative symbols aloud.
 */

function verbalizeSimpleInlineMath(inner: string): string {
  let t = inner.trim();
  t = t.replace(/\^2\b/g, ' squared');
  t = t.replace(/\^3\b/g, ' cubed');
  t = t.replace(/\^(\d+)/g, ' to the power $1');
  t = t.replace(/\s*\*\s*/g, ' times ');
  t = t.replace(/\s*=\s*/g, ' equals ');
  t = t.replace(/\s*\+\s*/g, ' plus ');
  t = t.replace(/\s*-\s*/g, ' minus ');
  t = t.replace(/\s*\/\s*/g, ' divided by ');
  return t.replace(/^\(|\)$/g, '').trim();
}

/**
 * Strip notation and describe simple math in words for speech synthesis.
 * Narration is Hinglish (Hindi + English mixed, Roman script).
 */
export function narrationForSpeech(raw: string | undefined | null): string {
  if (raw == null) return 'Chaliye, aage badhte hain.';
  let s = String(raw).trim();
  if (!s) return 'Chaliye, aage badhte hain.';

  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');

  s = s.replace(/\$\$[\s\S]*?\$\$/g, ' ');

  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, ' $1 over $2 ');
  s = s.replace(/\\times|\\cdot/gi, ' times ');
  s = s.replace(/\\pm\b/g, ' plus or minus ');
  s = s.replace(/\\sqrt\{([^}]*)\}/g, ' square root of $1 ');
  s = s.replace(/\\(?:rightarrow|Rightarrow|longrightarrow|mapsto|implies)\b|\\to\b/gi, ', phir ');

  s = s.replace(/\$([^$]+)\$/g, (_, inner) => {
    const t = String(inner).trim();
    if (/^[a-zA-Z0-9+\-=*\/^()., ]+$/.test(t) && t.length < 80) {
      return ` ${verbalizeSimpleInlineMath(t)} `;
    }
    return ' ';
  });

  s = s.replace(/\$/g, ' ');

  s = s.replace(/→|⟶|\u2192/g, ', phir ');
  s = s.replace(/←|\u2190/g, ', wahan se ');
  s = s.replace(/⇒|⟹|⇔/g, ', matlab ');
  s = s.replace(/\s*->\s*/g, ', phir ');

  s = s.replace(/\\[a-zA-Z]+\*?/g, ' ');

  s = s.replace(/[#*_`[\]^\\|]/g, ' ');
  s = s.replace(/[{}]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+,/g, ',');
  s = s.replace(/\s+\./g, '.');

  return s || 'Chaliye, next point pe jaate hain.';
}

/**
 * Readable on-canvas text: drop LaTeX delimiters and common commands without speaking.
 */
export function whiteboardElementText(raw: string | undefined | null): string {
  if (raw == null) return '';
  let s = String(raw);
  s = s.replace(/\$\$?/g, '');
  s = s.replace(/\\(?:rightarrow|Rightarrow|longrightarrow|mapsto|implies)\b|\\to\b/gi, '→');
  s = s.replace(/\\left|\\right|\\,/g, ' ');
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
  s = s.replace(/\\times|\\cdot/gi, '·');
  s = s.replace(/\\pm\b/g, '±');
  s = s.replace(/\\sqrt(?:\[[^\]]*\])?\{([^}]*)\}/g, '√($1)');
  s = s.replace(/\\[a-zA-Z]+\*?(\{[^}]*\})?/g, ' ');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Split flowchart / arrow chains after normalizing arrow tokens. */
export const FLOW_STEP_SPLIT = /→|->|⟶|\u2192/;
