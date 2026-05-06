const VALID_SUBJECTS = new Set([
  'mathematics', 'physics', 'chemistry', 'biology',
  'computer_science', 'history', 'economics', 'general',
]);

const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);

function normalizeSubjectTag(raw) {
  if (!raw) return 'general';
  const lower = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (VALID_SUBJECTS.has(lower)) return lower;

  const aliases = {
    math: 'mathematics', maths: 'mathematics', algebra: 'mathematics', calculus: 'mathematics',
    bio: 'biology', botany: 'biology', zoology: 'biology',
    chem: 'chemistry', organic_chemistry: 'chemistry',
    cs: 'computer_science', coding: 'computer_science', programming: 'computer_science',
    dsa: 'computer_science', data_structures: 'computer_science', algorithms: 'computer_science',
    eco: 'economics', finance: 'economics', accounting: 'economics',
    hist: 'history', civics: 'history', political_science: 'history',
    phy: 'physics', mechanics: 'physics', optics: 'physics',
  };

  return aliases[lower] || 'general';
}

function normalizeDifficulty(raw) {
  if (!raw) return 'medium';
  const lower = raw.toLowerCase().trim();
  if (VALID_DIFFICULTY.has(lower)) return lower;
  if (lower.includes('easy') || lower.includes('basic') || lower.includes('beginner')) return 'easy';
  if (lower.includes('hard') || lower.includes('advanced') || lower.includes('complex')) return 'hard';
  return 'medium';
}

function validateChartData(chart) {
  if (!chart || typeof chart !== 'object') return null;
  if (!Array.isArray(chart.labels) || !Array.isArray(chart.values)) return null;
  if (chart.labels.length === 0 || chart.values.length === 0) return null;

  return {
    type: chart.type || 'bar',
    title: chart.title || 'Data Overview',
    labels: chart.labels.map(String),
    values: chart.values.map(Number).map(v => isNaN(v) ? 0 : v),
  };
}

function validateSlideCode(code) {
  if (!code || typeof code !== 'object') return null;
  const source = typeof code.source === 'string' ? code.source.trim() : '';
  if (!source) return null;
  const language = typeof code.language === 'string' && code.language.trim()
    ? code.language.trim().toLowerCase()
    : 'text';
  return { language, source };
}

function sanitizeMermaidSource(src) {
  if (typeof src !== 'string') return '';
  let s = src.replace(/^```(?:mermaid|mmd)?\s*/i, '').replace(/```\s*$/, '').trim();

  s = s
    .split('\n')
    .map((line) => {
      const t = line.trimStart();
      // Drop full-line `#`/`//`/`%%` comments
      if (/^#(?!#)/.test(t) || /^\/\//.test(t) || /^%%/.test(t)) return '';
      // Drop styling lines (style/linkStyle/classDef/class) — they reference nodes
      // that may not exist and often use disallowed unit syntax.
      if (/^(style|linkStyle|classDef|class)\s+/i.test(t)) return '';

      // Strip trailing inline `#`/`//`/`%%` comments (ignoring quoted labels)
      let out = line;
      let inQuote = false;
      for (let i = 0; i < out.length; i++) {
        if (out[i] === '"') { inQuote = !inQuote; continue; }
        if (inQuote) continue;
        const prev = out[i - 1] || ' ';
        const next = out[i + 1] || '';
        if (out[i] === '#' && /\s/.test(prev) && next !== '#') { out = out.slice(0, i).trimEnd(); break; }
        if (out[i] === '/' && next === '/' && /\s/.test(prev)) { out = out.slice(0, i).trimEnd(); break; }
        if (out[i] === '%' && next === '%' && /\s/.test(prev)) { out = out.slice(0, i).trimEnd(); break; }
      }
      return out;
    })
    .filter((l) => l.trim() !== '')
    .join('\n');

  // Promote ambiguous "A -- B" (no closing label) to "A --- B"
  s = s.replace(/([A-Za-z0-9_\])>}])\s+--\s+([A-Za-z0-9_(\[<{])/g, '$1 --- $2');
  return s;
}

function validateSlideDiagram(diagram) {
  if (typeof diagram !== 'string') return null;
  const cleaned = sanitizeMermaidSource(diagram);
  return cleaned ? cleaned : null;
}

function validateSlideFormula(formula) {
  if (typeof formula !== 'string') return null;
  // Strip surrounding $$ if the LLM included them anyway
  const trimmed = formula.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '').trim();
  return trimmed ? trimmed : null;
}

function validateAnimationScript(script) {
  if (!Array.isArray(script) || script.length === 0) return [];

  return script
    .filter(slide => slide && slide.title)
    .map((slide, i) => ({
      slide: i + 1,
      title: String(slide.title),
      bullets: Array.isArray(slide.bullets) ? slide.bullets.map(String) : [],
      code: validateSlideCode(slide.code),
      diagram: validateSlideDiagram(slide.diagram),
      formula: validateSlideFormula(slide.formula),
    }));
}

/**
 * Parse and validate the structured JSON response from the LLM.
 * Handles: malformed JSON, missing fields, wrong types — always returns a usable object.
 */
function parseStructuredResponse(rawText) {
  let data;

  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleaned);
  } catch {
    return {
      explanation: rawText || 'Unable to parse response.',
      keyPoints: [],
      chartData: null,
      animationScript: [],
      videoScript: '',
      subjectTag: 'general',
      difficultyLevel: 'medium',
      parseError: true,
    };
  }

  const keyPoints = Array.isArray(data.keyPoints)
    ? data.keyPoints.map(String).slice(0, 4)
    : [];

  while (keyPoints.length < 4) {
    keyPoints.push('—');
  }

  return {
    explanation: data.explanation || 'No explanation provided.',
    keyPoints,
    chartData: validateChartData(data.chartData),
    animationScript: validateAnimationScript(data.animationScript),
    videoScript: typeof data.videoScript === 'string' ? data.videoScript : '',
    subjectTag: normalizeSubjectTag(data.subjectTag),
    difficultyLevel: normalizeDifficulty(data.difficultyLevel),
    parseError: false,
  };
}

module.exports = {
  parseStructuredResponse,
  normalizeSubjectTag,
  normalizeDifficulty,
  VALID_SUBJECTS,
  VALID_DIFFICULTY,
};
