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

function validateAnimationScript(script) {
  if (!Array.isArray(script) || script.length === 0) return [];

  return script
    .filter(slide => slide && slide.title)
    .map((slide, i) => ({
      slide: i + 1,
      title: String(slide.title),
      bullets: Array.isArray(slide.bullets) ? slide.bullets.map(String) : [],
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
