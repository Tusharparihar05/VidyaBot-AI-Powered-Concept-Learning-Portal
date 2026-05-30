<div align="center">

# 🤖 VidyaBot
### AI-Powered Concept Learning Portal

**Project 21 · Education & AI · MERN Stack · BTech Minor Project**

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![NVIDIA](https://img.shields.io/badge/NVIDIA-NIM_API-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://build.nvidia.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

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
| 📝 **Text + Chart** | Markdown explanation with KaTeX math and a Chart.js bar chart |
| 🎨 **Whiteboard Animation** | Custom HTML5 Canvas renderer — hand-drawn diagrams, 5–7 scenes, zone-based no-overlap layout |
| 🎬 **Avatar Video** | HeyGen AI avatar with lip-synced voice from the LLM-generated script |

---

## 🏗️ System Architecture

![VidyaBot System Architecture](assets/architecture.jpeg)

**Key points:**
- **NVIDIA NeMo LLM** (meta-llama models) handles prompt refinement + structured response generation
- **Three-layer cache** — Redis (fast/ephemeral) → MongoDB Content table (durable) → NVIDIA API on miss
- **Manim Video Rendering** — isolated Python/FastAPI microservice; backend triggers it, renders MP4, frontend polls & streams
- **Nginx** reverse proxy as single entry point; serves static frontend, proxies `/api` to Node.js backend

---

## 🔄 User Flow

![VidyaBot User Flow](assets/userflow.jpeg)

| Phase | What Happens |
|-------|-------------|
| **1. Auth** | Sign up → bcrypt hash → JWT issued → AuthContext set → redirect to Dashboard |
| **2. Dashboard** | Sidebar loads chats & folders from MongoDB; user picks or creates a chat |
| **3. Ask Question** | Rate-limit check (Redis) → NVIDIA LLM → parse → store in MongoDB → three outputs rendered |
| **4. Ongoing** | Continue chat, rename/delete chats, view analytics heatmap, update profile, logout |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, KaTeX, Chart.js, Mermaid, Reveal.js, HTML5 Canvas |
| **Backend** | Node.js 20, Express 4, Mongoose, JWT, bcryptjs, ioredis, express-validator |
| **AI & Media** | NVIDIA NIM (`meta/llama2-70b-chat-hf`), HeyGen, Manim (Python), FastAPI |
| **Infrastructure** | MongoDB 7, Redis 7 Alpine, Docker Compose, Nginx |

---

## 📁 Project Structure

```
VidyaBot-AI-Powered-Concept-Learning-Portal/
│
├── backend/
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   ├── redis.js                 # ioredis client
│   │   └── dailyQuestionLimit.js    # Rate limit constants
│   ├── models/
│   │   ├── User.js
│   │   ├── Chat.js
│   │   ├── Message.js
│   │   ├── Content.js               # Persistent content cache (promptHash keyed)
│   │   ├── ChatFolder.js
│   │   ├── History.js               # Telemetry / analytics events
│   │   └── Session.js               # LLM context window (TTL-indexed)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   └── analytics.routes.js
│   ├── services/
│   │   ├── nvidiaService.js         # NVIDIA NIM API wrapper (OpenAI-compatible)
│   │   ├── cache.service.js         # Redis L1 → MongoDB L2 waterfall lookup
│   │   ├── responseParser.js        # Structures raw LLM output into fields
│   │   ├── contentService.js        # Whiteboard script + content generation
│   │   └── heygenService.js         # Avatar video job submission & polling
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT validation, injects user to req
│   │   └── rateLimiter.js           # Redis-backed per-user daily limit
│   └── server.js
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   └── WhiteboardAnimPlayer.tsx   # Zone-based Canvas engine
│   │   │   └── Header.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Auth.tsx
│   │   └── context/
│   │       ├── AuthContext.tsx       # useCallback for signUp/signIn/logout
│   │       └── ThemeContext.tsx      # useMemo for stable context value
│   └── vite.config.ts
│
├── video-service/                   # Python FastAPI + Manim renderer
│   ├── main.py
│   ├── routers/video.py
│   ├── renderer.py
│   └── requirements.txt
│
├── assets/                          # Images
│   ├── architecture.jpeg            # System architecture diagram
│   └── userflow.jpeg                # User flow diagram
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

**Prerequisites:** Node.js 20+, Docker Desktop, NVIDIA NIM API key

```bash
# 1. Clone
git clone https://github.com/Tusharparihar05/VidyaBot-AI-Powered-Concept-Learning-Portal.git
cd VidyaBot-AI-Powered-Concept-Learning-Portal

# 2. Start MongoDB + Redis
docker-compose up -d

# 3. Backend
cd backend
cp .env.example .env        # fill in your keys
npm install
npm run dev                 # http://localhost:8000

# 4. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

---

## 🔑 Environment Variables

```env
# backend/.env

# Database
MONGO_URI=mongodb://admin:admin@localhost:27017/vidyabot?authSource=admin
REDIS_URL=redis://127.0.0.1:6379

# Auth
JWT_SECRET=your_jwt_secret_here

# NVIDIA NIM API
NVIDIA_API_KEY=your_nvidia_nim_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama2-70b-chat-hf

# HeyGen (Avatar Video)
HEYGEN_API_KEY=your_heygen_api_key     # optional

# Rate Limiting
MAX_QUESTIONS_PER_DAY=20
```

```env
# client/.env
VITE_API_URL=http://localhost:8000
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | ❌ | Register → returns JWT + profile |
| `POST` | `/api/auth/login` | ❌ | Login → returns JWT + profile |
| `POST` | `/api/auth/logout` | ✅ | Clears session from Redis |
| `GET` | `/api/chats` | ✅ | Paginated chat list |
| `POST` | `/api/chats` | ✅ | Create new chat |
| `PUT` | `/api/chats/:id` | ✅ | Rename / move to folder |
| `DELETE` | `/api/chats/:id` | ✅ | Delete chat + messages |
| `POST` | `/api/chat/:id/messages` | ✅ | Send message → triggers full AI pipeline |
| `GET` | `/api/analytics` | ✅ | Usage stats (Redis-cached 1 h) |
| `PUT` | `/api/profile/update` | ✅ | Update user profile |

Protected routes require `Authorization: Bearer <token>`.

---

## ⚡ Key Features

- **Three-layer content cache** — Redis (2 h TTL) → MongoDB (permanent), keyed by `SHA256(normalised prompt)`; eliminates redundant NVIDIA API calls across all users
- **Per-user rate limiting** — Redis counter with 24 h auto-reset TTL; returns `429` with `Retry-After` on breach — no cron job needed
- **Manim animation pipeline** — Python/FastAPI microservice renders math animations to MP4 on the server; frontend polls job status
- **Zone-based Canvas renderer** — 720×400 canvas divided into Top / Center / Bottom zones; bullets are pinned to bottom zone only — zero overlap with diagrams ever
- **SSE streaming** — real-time token-by-token response stream for instant perceived response
- **Dark / light theme** — `ThemeContext` with `useMemo` ensures stable context reference, preventing unnecessary re-renders

---

## 📄 License

MIT © 2026 Group 6 — BTech 2023 Batch

<div align="center">
<br/>

⭐ Star the repo if you found this useful!

</div>
