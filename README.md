<div align="center">

# 🤖 VidyaBot
### AI-Powered Concept Learning Portal

**Project 21 · Education & AI · MERN Stack · BTech Minor Project**

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![NVIDIA](https://img.shields.io/badge/NVIDIA-NIM_API-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://build.nvidia.com)

> Students ask any question — VidyaBot answers in **three formats simultaneously.**

</div>

---

## 👥 Group 6

| Name | Roll No. |
|------|----------|
| Ananya Garg | 2023BTech007 |
| Tannu Bagadia | 2023BTech090 |
| Tushar Suresh Parihar | 2023BTech093 |
| Labish Bardiya | 2023BTech106 |

---

## 🎯 What It Does

VidyaBot is a learning portal for students from **Class 9 to BTech CSE**. Type any question and instantly get three outputs in parallel:

| Output | Description |
|--------|-------------|
| 📝 **Text + Chart** | Markdown explanation with KaTeX math and a Chart.js visualisation |
| 🎨 **Whiteboard Animation** | Custom HTML5 Canvas renderer — hand-drawn diagrams, 5–7 scenes, zone-based layout |
| 🎬 **Avatar Video** | HeyGen AI avatar with lip-synced speech from the LLM-generated script |

---

## 🏗️ Architecture

```
React + Vite (Frontend)
        │  REST + SSE
        ▼
Node.js + Express (Backend)
   ├── NVIDIA NIM API  (LLaMA 2-70B)  — content generation
   ├── HeyGen API                      — avatar video
   ├── MongoDB 7                       — persistent storage
   └── Redis 7                         — cache + rate limiting
```

**Request flow:** Rate-limit check → SHA-256 prompt hash → Redis cache → MongoDB cache → NVIDIA API → parse → persist → SSE stream to browser.

---

## 🛠️ Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, KaTeX, Chart.js, HTML5 Canvas  
**Backend:** Node.js, Express, Mongoose, JWT, bcryptjs, ioredis  
**AI:** NVIDIA NIM (`meta/llama2-70b-chat-hf`), HeyGen  
**Infra:** MongoDB 7, Redis 7, Docker Compose, Nginx

---

## 🚀 Getting Started

```bash
# 1. Clone
git clone https://github.com/Tusharparihar05/VidyaBot-AI-Powered-Concept-Learning-Portal.git
cd VidyaBot-AI-Powered-Concept-Learning-Portal

# 2. Start MongoDB + Redis
docker-compose up -d

# 3. Backend
cd backend && cp .env.example .env   # fill in your keys
npm install && npm run dev           # runs on :8000

# 4. Frontend
cd client
npm install && npm run dev           # runs on :5173
```

---

## 🔑 Environment Variables

```env
# backend/.env
MONGO_URI=mongodb://admin:admin@localhost:27017/vidyabot?authSource=admin
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your_jwt_secret

NVIDIA_API_KEY=your_nvidia_nim_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama2-70b-chat-hf

HEYGEN_API_KEY=your_heygen_key      # optional
MAX_QUESTIONS_PER_DAY=20

# client/.env
VITE_API_URL=http://localhost:4000
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register + get JWT |
| `POST` | `/api/auth/login` | Login + get JWT |
| `GET` | `/api/chats` | List all chats |
| `POST` | `/api/chat/:id/messages` | Send message → triggers AI pipeline |
| `GET` | `/api/analytics` | Usage stats |

All protected routes require `Authorization: Bearer <token>`.

---

## ⚡ Key Features

- **Two-layer cache** — Redis (2 h TTL) → MongoDB (permanent) keyed by `SHA256(prompt)`; eliminates redundant NVIDIA API calls
- **Per-user rate limiting** — Redis counter with 24 h TTL; returns `429` on breach
- **Zone-based Canvas renderer** — 720×400 canvas split into Top / Center / Bottom zones; bullet points never overlap diagrams
- **SSE streaming** — tokens streamed token-by-token to the browser for real-time feel
- **Dark / light theme** — ThemeContext with `useMemo` for stable context values

---

## 📄 License

MIT © 2026 Group 6 — BTech 2023 Batch

<div align="center">
<br/>
⭐ Star the repo if you found it useful!
</div>
