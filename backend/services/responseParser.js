const { sanitizeNarrationForSpeech } = require('../utils/narrationPlain');

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

  const labels = chart.labels.map(String);
  const values = chart.values.map(v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
  const n = Math.min(labels.length, values.length);
  if (n < 2) return null;

  return {
    type: chart.type || 'bar',
    title: chart.title || 'Data Overview',
    labels: labels.slice(0, n),
    values: values.slice(0, n),
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

function validateWhiteboardElement(el) {
  if (!el || typeof el !== 'object') return null;
  const validTypes = [
    'text', 'box', 'arrow', 'circle', 'icon', 'underline',
    'flowchart', 'formula_box', 'graph_axes', 'bullets', 'chart',
  ];
  const validPositions = [
    'top_left', 'top_center', 'top_right', 'center_left', 'center', 'center_right',
    'bottom_left', 'bottom_center', 'bottom_right',
  ];
  const type = validTypes.includes(el.type) ? el.type : 'text';
  const position = validPositions.includes(el.position) ? el.position : 'center';
  let content = typeof el.content === 'string' ? el.content.trim() : '';
  const color = typeof el.color === 'string' && /^#[0-9a-fA-F]{3,6}$/.test(el.color) ? el.color : '#1f2937';
  if (type === 'chart') {
    if (!content) content = 'Comparison';
    return { type, content, position, color };
  }
  if (!content) return null;
  return { type, content, position, color };
}

function validateWhiteboardScript(script) {
  if (!script || typeof script !== 'object') return null;
  const title = typeof script.title === 'string' ? script.title.trim() : 'Topic Overview';
  if (!Array.isArray(script.scenes) || script.scenes.length === 0) return null;

  const scenes = script.scenes
    .filter(s => s && typeof s === 'object')
    .map((s, i) => ({
      scene_number: typeof s.scene_number === 'number' ? s.scene_number : i + 1,
      narration: typeof s.narration === 'string' ? s.narration.trim() : '',
      elements: Array.isArray(s.elements)
        ? s.elements.map(validateWhiteboardElement).filter(Boolean)
        : [],
      duration: typeof s.duration === 'number' && s.duration > 0 ? s.duration : 5,
    }))
    .filter(s => s.elements.length > 0 || s.narration);

  if (scenes.length === 0) return null;
  return { title, scenes };
}

/** Types that need a distinct slot so they do not stack on the same coordinates */
const WHITEBOARD_SLOT_TYPES = new Set([
  'text', 'box', 'bullets', 'formula_box', 'graph_axes', 'flowchart', 'chart',
]);

const POSITION_FALLBACK_ORDER = [
  'top_center', 'top_left', 'center_left', 'center_right',
  'bottom_center', 'top_right', 'bottom_left', 'center', 'bottom_right',
];

/**
 * Fix overlapping elements, strip inappropriate coordinate graphs, trim verbosity,
 * and attach a chart element when chartData exists (matches chat chart / Redis cache payload).
 */
function layoutAndEnrichWhiteboard(whiteboardScript, chartData, subjectTag, questionCategory, keyPoints) {
  if (!whiteboardScript || !Array.isArray(whiteboardScript.scenes)) return whiteboardScript;

  const allowGraphAxes =
    (subjectTag === 'mathematics' || subjectTag === 'physics')
    && questionCategory === 'mathematical';

  const safeKeyPoints = Array.isArray(keyPoints)
    ? keyPoints.map(String).filter(k => k && k !== '—')
    : [];

  const scenes = whiteboardScript.scenes.map((scene) => {
    let elements = scene.elements.map((el) => {
      if (el.type === 'graph_axes' && !allowGraphAxes) {
        const chain = safeKeyPoints.length >= 2
          ? safeKeyPoints.slice(0, 4).join(' → ')
          : 'Main idea → Details → Example';
        return { ...el, type: 'flowchart', content: chain, position: el.position || 'center' };
      }
      return el;
    });

    const used = new Set();
    elements = elements.map((el) => {
      if (!WHITEBOARD_SLOT_TYPES.has(el.type)) return el;
      let pos = el.position;
      if (used.has(pos)) {
        for (const p of POSITION_FALLBACK_ORDER) {
          if (!used.has(p)) {
            pos = p;
            break;
          }
        }
      }
      used.add(pos);
      return { ...el, position: pos };
    });

    elements = elements.map((el) => {
      const trimLine = (s, max) => {
        const t = String(s).trim();
        return t.length > max ? `${t.slice(0, max - 1)}…` : t;
      };
      if (el.type === 'text' || el.type === 'box' || el.type === 'underline') {
        return { ...el, content: trimLine(el.content, 180) };
      }
      if (el.type === 'icon' || el.type === 'circle' || el.type === 'arrow') {
        return { ...el, content: trimLine(el.content, 120) };
      }
      if (el.type === 'bullets') {
        const lines = String(el.content)
          .split(/\r?\n/)
          .map(s => trimLine(s.replace(/^[•\-–]\s*/, ''), 140))
          .filter(Boolean)
          .slice(0, 5);
        return lines.length ? { ...el, content: lines.join('\n') } : el;
      }
      if (el.type === 'flowchart') {
        return { ...el, content: trimLine(el.content.replace(/\n/g, ' '), 200) };
      }
      if (el.type === 'formula_box') {
        return { ...el, content: trimLine(el.content.replace(/\n/g, ' '), 320) };
      }
      if (el.type === 'chart') {
        return { ...el, content: trimLine(el.content, 80) };
      }
      return el;
    });

    return {
      ...scene,
      narration: sanitizeNarrationForSpeech(scene.narration),
      elements,
    };
  });

  const hasChartEl = scenes.some(s => s.elements.some(e => e.type === 'chart'));
  if (chartData && chartData.labels?.length >= 2 && !hasChartEl && scenes.length > 0) {
    const insertIdx = Math.min(2, scenes.length - 1);
    const scene = scenes[insertIdx];
    const used = new Set(
      scene.elements.filter(e => WHITEBOARD_SLOT_TYPES.has(e.type)).map(e => e.position),
    );
    let pos = 'center_right';
    for (const p of POSITION_FALLBACK_ORDER) {
      if (!used.has(p)) {
        pos = p;
        break;
      }
    }
    scene.elements.push({
      type: 'chart',
      content: chartData.title || 'Comparison',
      position: pos,
      color: '#1e40af',
    });
  }

  return { ...whiteboardScript, scenes };
}

/** Re-validate chart + whiteboard when loading from Redis/Mongo so overlap fixes apply to old cache entries. */
function polishCachedAssistantMetadata(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const subjectTag = normalizeSubjectTag(meta.subjectTag);
  const questionCategory = meta.questionCategory === 'mathematical' ? 'mathematical' : 'theoretical';
  const chartData = validateChartData(meta.chartData);
  const keyPoints = Array.isArray(meta.keyPoints) ? meta.keyPoints.map(String) : [];
  while (keyPoints.length < 4) keyPoints.push('—');

  let { whiteboardScript } = meta;
  if (whiteboardScript) {
    const validated = validateWhiteboardScript(whiteboardScript);
    whiteboardScript = validated
      ? layoutAndEnrichWhiteboard(validated, chartData, subjectTag, questionCategory, keyPoints)
      : whiteboardScript;
  }

  return {
    ...meta,
    subjectTag,
    questionCategory,
    chartData,
    keyPoints,
    whiteboardScript,
  };
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
      questionCategory: 'theoretical',
      whiteboardScript: null,
      parseError: true,
    };
  }

  const keyPoints = Array.isArray(data.keyPoints)
    ? data.keyPoints.map(String).slice(0, 4)
    : [];

  while (keyPoints.length < 4) {
    keyPoints.push('—');
  }

  const subjectTag = normalizeSubjectTag(data.subjectTag);
  const questionCategory = data.questionCategory === 'mathematical' ? 'mathematical' : 'theoretical';
  const chartData = validateChartData(data.chartData);
  const rawBoard = validateWhiteboardScript(data.whiteboardScript);
  const whiteboardScript = layoutAndEnrichWhiteboard(rawBoard, chartData, subjectTag, questionCategory, keyPoints);

  return {
    explanation: data.explanation || 'No explanation provided.',
    keyPoints,
    chartData,
    animationScript: validateAnimationScript(data.animationScript),
    videoScript: typeof data.videoScript === 'string' ? data.videoScript : '',
    subjectTag,
    difficultyLevel: normalizeDifficulty(data.difficultyLevel),
    questionCategory,
    whiteboardScript,
    parseError: false,
  };
}

module.exports = {
  parseStructuredResponse,
  normalizeSubjectTag,
  normalizeDifficulty,
  layoutAndEnrichWhiteboard,
  polishCachedAssistantMetadata,
  VALID_SUBJECTS,
  VALID_DIFFICULTY,
};
