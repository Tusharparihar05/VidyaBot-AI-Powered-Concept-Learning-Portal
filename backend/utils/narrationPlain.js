/**
 * Normalize whiteboard narration for speech (no LaTeX/markdown read aloud).
 */

function verbalizeSimpleInlineMath(inner) {
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

function sanitizeNarrationForSpeech(raw) {
  if (raw == null || typeof raw !== 'string') return 'Let us continue.';
  let s = raw.trim();
  if (!s) return 'Let us continue.';

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
  s = s.replace(/\\(?:rightarrow|Rightarrow|longrightarrow|mapsto|implies)\b|\\to\b/gi, ', then ');

  s = s.replace(/\$([^$]+)\$/g, (_, inner) => {
    const t = String(inner).trim();
    if (/^[a-zA-Z0-9+\-=*\/^()., ]+$/.test(t) && t.length < 80) {
      return ` ${verbalizeSimpleInlineMath(t)} `;
    }
    return ' ';
  });

  s = s.replace(/\$/g, ' ');

  s = s.replace(/→|⟶|\u2192/g, ', then ');
  s = s.replace(/←|\u2190/g, ', from ');
  s = s.replace(/⇒|⟹|⇔/g, ', so ');
  s = s.replace(/\s*-\s*>\s*/g, ', then ');

  s = s.replace(/\\[a-zA-Z]+\*?/g, ' ');

  s = s.replace(/[#*_`[\]^\\|]/g, ' ');
  s = s.replace(/[{}]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+,/g, ',');
  s = s.replace(/\s+\./g, '.');

  return s || 'Let us continue with the next idea.';
}

module.exports = { sanitizeNarrationForSpeech };
