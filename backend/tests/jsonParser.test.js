function parseClaudeResponse(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    return null;
  }
}

function transformToChartData(history) {
  const tagCounts = {};
  history.forEach((item) => {
    const tag = item.subjectTag || 'general';
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  return {
    labels: Object.keys(tagCounts),
    data: Object.values(tagCounts),
  };
}

describe('JSON Parser Tests', () => {
  test('parses valid JSON correctly', () => {
    const input = '{"explanation": "hello", "keyPoints": ["a","b"]}';
    const result = parseClaudeResponse(input);
    expect(result.explanation).toBe('hello');
    expect(result.keyPoints).toHaveLength(2);
  });

  test('parses JSON with markdown code fences', () => {
    const input = '```json\n{"explanation": "test"}\n```';
    const result = parseClaudeResponse(input);
    expect(result.explanation).toBe('test');
  });

  test('returns null for invalid JSON', () => {
    const result = parseClaudeResponse('this is not json');
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = parseClaudeResponse('');
    expect(result).toBeNull();
  });
});

describe('Chart Transformation Tests', () => {
  test('counts subjects correctly', () => {
    const history = [
      { subjectTag: 'mathematics' },
      { subjectTag: 'mathematics' },
      { subjectTag: 'biology' },
    ];
    const result = transformToChartData(history);
    expect(result.labels).toContain('mathematics');
    expect(result.data[result.labels.indexOf('mathematics')]).toBe(2);
  });

  test('uses general when subjectTag missing', () => {
    const history = [{ rawQuestion: 'what is life' }];
    const result = transformToChartData(history);
    expect(result.labels).toContain('general');
  });

  test('returns empty for empty history', () => {
    const result = transformToChartData([]);
    expect(result.labels).toHaveLength(0);
  });
});