# VidyaBot API Contracts

All endpoints return JSON. Auth-protected routes require `Authorization: Bearer <jwt>` header.

---

## POST /api/auth/register

**Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string (min 6 chars)",
  "institutionType": "school | college",
  "institutionName": "string",
  "gradeYear": "string"
}
```

**Response (201):**
```json
{
  "token": "jwt_string",
  "user": { "id": "string", "name": "string", "email": "string", "gradeYear": "string" }
}
```

---

## POST /api/auth/login

**Body:** `{ "email": "string", "password": "string" }`

**Response (200):** Same as register.

---

## POST /api/refine (auth required)

Refine a raw question into a structured learning prompt.

**Body:** `{ "question": "string" }`

**Response (200):**
```json
{
  "refinedPrompt": "string",
  "grade": "string",
  "fallback": "boolean (only present if LLM failed)"
}
```

---

## POST /api/question/submit (auth required, rate-limited)

Main pipeline — generates the full structured answer.

**Body:** `{ "question": "string" }`

**Response (200) — THE CORE CONTRACT:**
```json
{
  "success": true,
  "sessionId": "session_1714934567890",
  "rawQuestion": "what is photosynthesis",
  "grade": "Class 10",
  "refinedPrompt": "string",
  "explanation": "Detailed explanation (80+ words)",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
  "chartData": {
    "type": "bar",
    "title": "Chart title",
    "labels": ["Label1", "Label2", "Label3", "Label4"],
    "values": [10, 25, 40, 60]
  },
  "animationScript": [
    { "slide": 1, "title": "Slide title", "bullets": ["bullet 1", "bullet 2"] }
  ],
  "videoScript": "60-90 second teacher script...",
  "subjectTag": "biology",
  "difficultyLevel": "easy | medium | hard",
  "animationUrl": "null (until Phase 3 pipeline completes)",
  "avatarVideoUrl": "null (until Phase 3 pipeline completes)"
}
```

**Error (429):** `{ "message": "Daily limit exceeded. Try again tomorrow." }`

**Error (500):** `{ "success": false, "message": "Something went wrong.", "sessionId": "string" }`

---

## GET /api/status/:sessionId (auth required)

Check pipeline status for animation and video generation.

**Response (200):**
```json
{
  "sessionId": "string",
  "text": "done | pending | failed",
  "animation": "done | processing | pending | failed",
  "video": "done | processing | pending | failed"
}
```

---

## GET /api/history (auth required)

**Query params:** `?subject=mathematics` (optional filter)

**Response (200):**
```json
[
  {
    "rawQuestion": "string",
    "refinedPrompt": "string",
    "textAnswer": "string",
    "animationUrl": "string | null",
    "avatarVideoUrl": "string | null",
    "subjectTag": "string",
    "createdAt": "ISO date"
  }
]
```

---

## GET /api/history/tags (auth required)

**Response (200):** `["mathematics", "biology", "computer_science"]`

---

## External API Reference

### NVIDIA NIM (LLM)
- **Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
- **Model:** `nvidia/llama-3.3-nemotron-super-49b-v1`
- **Auth:** `Authorization: Bearer nvapi-xxx`
- **Rate limit:** ~40 requests/minute (free tier)
- **Cost:** Free
- **Latency:** 3-8 seconds for structured JSON

### Creatomate (Animation)
- **Endpoint:** `https://api.creatomate.com/v1/renders`
- **Auth:** `Authorization: Bearer <key>`
- **Flow:** POST render → get job ID → poll or webhook for status
- **Latency:** 30-120 seconds
- **Cost:** Per render (check plan)

### HeyGen (Avatar Video)
- **Endpoint:** `https://api.heygen.com/v2/video/generate`
- **Auth:** `X-Api-Key: <key>`
- **Flow:** POST video → get video_id → poll or webhook for status
- **Latency:** 60-180 seconds
- **Cost:** Per video minute (check plan)
