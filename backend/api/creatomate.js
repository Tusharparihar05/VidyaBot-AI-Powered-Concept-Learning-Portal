const axios = require('axios');

const API_KEY = process.env.CREATOMATE_API_KEY;
const TEMPLATE_ID = process.env.CREATOMATE_TEMPLATE_ID;
const BASE_URL = 'https://api.creatomate.com/v1';

// Template element mapping: each slide has a Title + Content text element
const SLIDE_ELEMENTS = [
  { title: 'Text-WVQ', content: 'Text-64M' },
  { title: 'Text-NCS', content: 'Text-4HP' },
  { title: 'Text-PX6', content: 'Text-83V' },
  { title: 'Text-QCR', content: 'Text-B8V' },
  { title: 'Text-PV7', content: 'Text-8QH' },
  { title: 'Text-8N6', content: 'Text-CF8' },
  { title: 'Text-W3X', content: 'Text-DN9' },
  { title: 'Text-VBD', content: 'Text-W42' },
];

function buildModifications(animationScript) {
  const modifications = {
    'fill_color': 'rgba(0,0,0,0)',
  };

  const slideCount = Math.min(animationScript.length, SLIDE_ELEMENTS.length);

  for (let i = 0; i < slideCount; i++) {
    const slide = animationScript[i];
    const el = SLIDE_ELEMENTS[i];

    modifications[`${el.title}.text`] = slide.title;
    modifications[`${el.title}.fill_color`] = '#1b1294';
    modifications[`${el.content}.text`] = slide.bullets.join('\n• ');
  }

  // Clear unused slides (set to empty if template has more slots than our script)
  for (let i = slideCount; i < SLIDE_ELEMENTS.length; i++) {
    const el = SLIDE_ELEMENTS[i];
    modifications[`${el.title}.text`] = ' ';
    modifications[`${el.content}.text`] = ' ';
  }

  return modifications;
}

async function submitRenderJob(animationScript) {
  if (!API_KEY || !TEMPLATE_ID) {
    console.warn('[Creatomate] No API key or template — returning mock job');
    return {
      id: `mock_creat_${Date.now()}`,
      status: 'planned',
      mock: true,
    };
  }

  const modifications = buildModifications(animationScript);

  console.log('[Creatomate] Submitting render with', Object.keys(modifications).length, 'modifications');

  let response;
  try {
    response = await axios.post(
      `${BASE_URL}/renders`,
      { template_id: TEMPLATE_ID, modifications },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );
  } catch (err) {
    if (err.response?.status === 402) {
      const noRetry = new Error('Creatomate: Insufficient credits. Add credits at creatomate.com/account.');
      noRetry.unrecoverable = true;
      throw noRetry;
    }
    throw err;
  }

  const render = Array.isArray(response.data) ? response.data[0] : response.data;
  console.log('[Creatomate] Render response:', { id: render?.id, status: render?.status });

  return {
    id: render?.id,
    status: render?.status || 'planned',
    mock: false,
  };
}

async function checkRenderStatus(jobId) {
  if (jobId.startsWith('mock_')) {
    return { id: jobId, status: 'succeeded', url: 'https://example.com/mock-animation.mp4' };
  }

  const { data } = await axios.get(`${BASE_URL}/renders/${jobId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    timeout: 10000,
  });

  return {
    id: data.id,
    status: data.status,
    url: data.url || null,
  };
}

module.exports = { submitRenderJob, checkRenderStatus };
