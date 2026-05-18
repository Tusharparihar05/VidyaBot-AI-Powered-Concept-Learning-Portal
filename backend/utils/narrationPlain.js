/**
 * Normalize whiteboard narration for speech (no LaTeX/markdown read aloud).
 * Narration is Hinglish (Hindi + English mixed, Roman script).
 * We only strip technical symbols; Hindi romanized words are preserved.
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
  if (raw == null || typeof raw !== 'string') return 'Chaliye, aage badhte hain.';
  let s = raw.trim();
  if (!s) return 'Chaliye, aage badhte hain.';

  // Strip markdown emphasis
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');

  // Strip block math
  s = s.replace(/\$\$[\s\S]*?\$\$/g, ' ');

  // Verbalize common LaTeX patterns
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, ' $1 over $2 ');
  s = s.replace(/\\times|\\cdot/gi, ' times ');
  s = s.replace(/\\pm\b/g, ' plus or minus ');
  s = s.replace(/\\sqrt\{([^}]*)\}/g, ' square root of $1 ');
  s = s.replace(/\\(?:rightarrow|Rightarrow|longrightarrow|mapsto|implies)\b|\\to\b/gi, ', phir ');

  // Inline math — verbalize simple expressions
  s = s.replace(/\$([^$]+)\$/g, (_, inner) => {
    const t = String(inner).trim();
    if (/^[a-zA-Z0-9+\-=*\/^()., ]+$/.test(t) && t.length < 80) {
      return ` ${verbalizeSimpleInlineMath(t)} `;
    }
    return ' ';
  });

  s = s.replace(/\$/g, ' ');

  // Arrow / symbol replacement in Hinglish style
  s = s.replace(/→|⟶|\u2192/g, ', phir ');
  s = s.replace(/←|\u2190/g, ', wahan se ');
  s = s.replace(/⇒|⟹|⇔/g, ', matlab ');
  s = s.replace(/\s*->\s*/g, ', phir ');

  // Strip remaining LaTeX commands
  s = s.replace(/\\[a-zA-Z]+\*?/g, ' ');

  // Strip remaining special markdown/code symbols but preserve apostrophes
  s = s.replace(/[#*_`[\]^\\|]/g, ' ');
  s = s.replace(/[{}]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+,/g, ',');
  s = s.replace(/\s+\./g, '.');

  return s || 'Chaliye, next point pe jaate hain.';
}

module.exports = { sanitizeNarrationForSpeech };
