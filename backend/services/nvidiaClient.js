const OpenAI = require('openai');

const client = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

const MODEL = process.env.NVIDIA_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000];

async function callNvidia(systemPrompt, userMessage, options = {}) {
  const {
    temperature = 0.7,
    maxTokens = 4096,
    jsonMode = false,
    conversationHistory = [],
  } = options;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const params = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create(params);
      return response.choices[0].message.content.trim();
    } catch (err) {
      lastError = err;

      const status = err.status || err.statusCode;
      if (status === 429 || status >= 500) {
        const delay = RETRY_DELAYS[attempt] || 9000;
        console.warn(`NVIDIA API attempt ${attempt + 1} failed (${status}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

async function* callNvidiaStream(systemPrompt, userMessage, options = {}) {
  const {
    temperature = 0.7,
    maxTokens = 4096,
    conversationHistory = [],
  } = options;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
      return;
    } catch (err) {
      lastError = err;
      const status = err.status || err.statusCode;
      if (status === 429 || status >= 500) {
        const delay = RETRY_DELAYS[attempt] || 9000;
        console.warn(`NVIDIA Stream attempt ${attempt + 1} failed (${status}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

module.exports = { callNvidia, callNvidiaStream, MODEL };
