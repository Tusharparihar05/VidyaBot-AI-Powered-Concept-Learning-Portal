const {
  parseStructuredResponse,
  normalizeSubjectTag,
  normalizeDifficulty,
} = require('../services/responseParser');

describe('normalizeSubjectTag', () => {
  test('returns valid tags unchanged', () => {
    expect(normalizeSubjectTag('mathematics')).toBe('mathematics');
    expect(normalizeSubjectTag('computer_science')).toBe('computer_science');
  });

  test('maps common aliases', () => {
    expect(normalizeSubjectTag('math')).toBe('mathematics');
    expect(normalizeSubjectTag('coding')).toBe('computer_science');
    expect(normalizeSubjectTag('bio')).toBe('biology');
    expect(normalizeSubjectTag('DSA')).toBe('computer_science');
  });

  test('defaults to general for unknown', () => {
    expect(normalizeSubjectTag('astrology')).toBe('general');
    expect(normalizeSubjectTag('')).toBe('general');
    expect(normalizeSubjectTag(null)).toBe('general');
  });
});

describe('normalizeDifficulty', () => {
  test('returns valid levels unchanged', () => {
    expect(normalizeDifficulty('easy')).toBe('easy');
    expect(normalizeDifficulty('hard')).toBe('hard');
  });

  test('extracts from descriptive strings', () => {
    expect(normalizeDifficulty('very easy')).toBe('easy');
    expect(normalizeDifficulty('advanced')).toBe('hard');
  });

  test('defaults to medium', () => {
    expect(normalizeDifficulty('unknown')).toBe('medium');
    expect(normalizeDifficulty(null)).toBe('medium');
  });
});

describe('parseStructuredResponse', () => {
  test('parses valid JSON correctly', () => {
    const input = JSON.stringify({
      explanation: 'Photosynthesis is the process...',
      keyPoints: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
      chartData: { type: 'bar', title: 'Energy', labels: ['A', 'B'], values: [10, 20] },
      animationScript: [{ slide: 1, title: 'Intro', bullets: ['hello'] }],
      videoScript: 'Welcome students...',
      subjectTag: 'biology',
      difficultyLevel: 'easy',
    });

    const result = parseStructuredResponse(input);
    expect(result.parseError).toBe(false);
    expect(result.subjectTag).toBe('biology');
    expect(result.keyPoints).toHaveLength(4);
    expect(result.chartData.values).toEqual([10, 20]);
  });

  test('handles JSON wrapped in markdown fences', () => {
    const input = '```json\n{"explanation":"test","keyPoints":["a","b","c","d"],"subjectTag":"math"}\n```';
    const result = parseStructuredResponse(input);
    expect(result.parseError).toBe(false);
    expect(result.subjectTag).toBe('mathematics');
  });

  test('handles missing chartData gracefully', () => {
    const input = JSON.stringify({
      explanation: 'Test',
      keyPoints: ['a', 'b', 'c', 'd'],
      subjectTag: 'physics',
    });
    const result = parseStructuredResponse(input);
    expect(result.chartData).toBeNull();
    expect(result.parseError).toBe(false);
  });

  test('pads keyPoints to 4 if fewer provided', () => {
    const input = JSON.stringify({ explanation: 'Test', keyPoints: ['only one'] });
    const result = parseStructuredResponse(input);
    expect(result.keyPoints).toHaveLength(4);
  });

  test('returns fallback on completely invalid input', () => {
    const result = parseStructuredResponse('this is not json at all');
    expect(result.parseError).toBe(true);
    expect(result.explanation).toBe('this is not json at all');
    expect(result.subjectTag).toBe('general');
  });

  test('handles empty animationScript', () => {
    const input = JSON.stringify({
      explanation: 'Test',
      keyPoints: ['a', 'b', 'c', 'd'],
      animationScript: [],
    });
    const result = parseStructuredResponse(input);
    expect(result.animationScript).toEqual([]);
  });

  test('coerces string values in chartData to numbers', () => {
    const input = JSON.stringify({
      explanation: 'Test',
      keyPoints: ['a', 'b', 'c', 'd'],
      chartData: { type: 'bar', labels: ['X', 'Y'], values: ['10', '20'] },
    });
    const result = parseStructuredResponse(input);
    expect(result.chartData.values).toEqual([10, 20]);
  });
});
