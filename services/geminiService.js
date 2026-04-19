const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;


const callGemini = async (promptText) => {
  const response = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: promptText }]
      }]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Gemini API error: ${data.error?.message || response.status}`);
  }

  return data.candidates[0].content.parts[0].text.trim();
};

const refinePrompt = async (rawQuestion, grade) => {
  const prompt = `
You are an expert educational prompt engineer for Indian students.
A ${grade} student has typed this raw question: "${rawQuestion}"

Rewrite it as a detailed structured learning prompt that includes:
1. The student grade level context: ${grade}
2. A request for a clear simple definition
3. A request for a real world analogy a ${grade} student can relate to
4. A request for exactly 4 key points
5. A request for simple numerical data that can be shown as a bar chart

Return ONLY the refined prompt text. No labels, no explanation, just the prompt.
`;

  return await callGemini(prompt);
};

const getStructuredAnswer = async (refinedPrompt, grade) => {
  const prompt = `
You are VidyaBot an AI tutor for Indian students from Class 9 to BTech.
You are answering for a ${grade} student. Adjust complexity accordingly.

Answer this learning prompt:
"${refinedPrompt}"

IMPORTANT: Respond with ONLY a valid JSON object.
No markdown, no backticks, no extra text. Just raw JSON.

Use exactly this structure:
{
  "explanation": "Detailed explanation suitable for ${grade} level. Minimum 80 words.",
  "keyPoints": [
    "First key point as one complete sentence",
    "Second key point as one complete sentence",
    "Third key point as one complete sentence",
    "Fourth key point as one complete sentence"
  ],
  "chartData": {
    "type": "bar",
    "title": "A meaningful chart title related to the concept",
    "labels": ["Label1", "Label2", "Label3", "Label4"],
    "values": [10, 25, 40, 60]
  },
  "subjectTag": "exactly one of: mathematics, physics, chemistry, biology, computer_science, history, economics, general"
}

Rules:
- keyPoints must have EXACTLY 4 items
- chartData values must be actual numbers not strings
- subjectTag must be exactly one word from the list
- Return ONLY the JSON object nothing else
`;

  const rawText = await callGemini(prompt);

  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(cleaned);
};

module.exports = { refinePrompt, getStructuredAnswer };