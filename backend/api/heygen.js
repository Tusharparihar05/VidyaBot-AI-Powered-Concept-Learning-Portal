const axios = require('axios');

const API_KEY = process.env.HEYGEN_API_KEY;
const AVATAR_ID = process.env.HEYGEN_AVATAR_ID || 'Angela-inblackskirt-20220820';
const VOICE_ID = process.env.HEYGEN_VOICE_ID;
const BASE_URL = 'https://api.heygen.com/v2';

/**
 * Submit an avatar video generation job to HeyGen.
 * In Phase 1 this returns a mock job — real API wired in Phase 3.
 */
async function submitVideoJob(videoScript) {
  if (!API_KEY) {
    console.warn('[HeyGen] No API key — returning mock job');
    return {
      id: `mock_heygen_${Date.now()}`,
      status: 'pending',
      mock: true,
    };
  }

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: AVATAR_ID,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: videoScript,
          voice_id: VOICE_ID,
        },
        background: {
          type: 'color',
          value: '#FFFFFF',
        },
      },
    ],
    dimension: { width: 1280, height: 720 },
  };

  const { data } = await axios.post(`${BASE_URL}/video/generate`, payload, {
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  return {
    id: data.data?.video_id,
    status: 'pending',
    mock: false,
  };
}

/**
 * Check the status of a HeyGen video generation job.
 * Phase 3 replaces this with webhook-based flow.
 */
async function checkVideoStatus(videoId) {
  if (videoId.startsWith('mock_')) {
    return { id: videoId, status: 'completed', url: 'https://example.com/mock-avatar.mp4' };
  }

  const { data } = await axios.get(`${BASE_URL}/video_status.get`, {
    params: { video_id: videoId },
    headers: { 'X-Api-Key': API_KEY },
    timeout: 10000,
  });

  return {
    id: videoId,
    status: data.data?.status,
    url: data.data?.video_url || null,
  };
}

module.exports = { submitVideoJob, checkVideoStatus };
