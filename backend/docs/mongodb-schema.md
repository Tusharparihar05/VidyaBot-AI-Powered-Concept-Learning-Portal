# VidyaBot — MongoDB collections

This app uses the **`vidyabot`** database. Below is what the **current codebase** reads and writes. If Compass shows extra collections (for example **`outputs`** with Creatomate URLs), they are **not referenced** in this repository — you can archive or drop them after backing up.

## Collections (active)

| Collection      | Model file          | Purpose |
|----------------|---------------------|--------|
| **users**      | `models/User.js`    | Accounts, profile, grade, institution. |
| **chats**      | `models/Chat.js`    | Chat threads: title, folder, counts, subject. |
| **chatfolders**| `models/ChatFolder.js` | User-defined folders for chats. |
| **messages**   | `models/Message.js` | User/assistant turns; assistant stores `keyPoints`, `chartData`, `animationScript`, `videoScript`, `whiteboardScript`, `questionCategory`, etc. |
| **sessions**   | `models/Session.js` | One row per “ask”: `promptHash`, pipeline status (`text` / `animation` / `video`), `cachedHit`. |
| **contents**   | `models/Content.js` | Deduplicated cache by `promptHash` (Redis + Mongo) for static Q&A without prior context. |
| **histories**  | `models/History.js` | Lightweight analytics log: question, answer snippet, `subjectTag` (optional `animationUrl` / `avatarVideoUrl` fields exist but are not populated by the current chat route). |

## Not defined in this repo

- **`outputs`** — Appears in some deployments with Creatomate / B2 URLs. **No `Output` model or routes** in this codebase. Safe to remove after confirming no external workers write to it.

## Single mental model

1. **Chat** = conversation container.  
2. **Message** = what you show in the UI (including **whiteboard JSON** on the assistant message).  
3. **Session** = bookkeeping for one generation request.  
4. **Content** = shared cache for identical questions (no history).  
5. **History** = coarse usage / subject tagging.

For whiteboard and Manim flows, the **source of truth** is **`messages.whiteboardScript`** and related fields on the same document — not a separate `outputs` collection.
