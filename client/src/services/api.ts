import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const raw = localStorage.getItem('vidyabot-auth');
  if (!raw) return {};
  try {
    const { token } = JSON.parse(raw);
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const headers = getAuthHeaders();
  Object.assign(config.headers, headers);
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vidyabot-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Chat types ---

export interface ChatItem {
  _id: string;
  title: string;
  folderId?: string | null;
  subjectTag: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatFolderItem {
  _id: string;
  name: string;
  createdAt: string;
}

export interface MessageItem {
  _id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  keyPoints?: string[];
  chartData?: { type: string; title: string; labels: string[]; values: number[] } | null;
  animationScript?: {
    slide: number;
    title: string;
    bullets: string[];
    code?: { language: string; source: string } | null;
    diagram?: string | null;
    formula?: string | null;
  }[];
  videoScript?: string;
  questionCategory?: 'mathematical' | 'theoretical';
  whiteboardScript?: {
    title: string;
    scenes: {
      scene_number: number;
      narration: string;
      elements: {
        type: 'text' | 'box' | 'arrow' | 'circle' | 'icon' | 'underline' | 'flowchart' | 'formula_box' | 'graph_axes' | 'bullets' | 'chart' | 'stack_diagram' | 'queue_diagram' | 'array_diagram' | 'linked_list' | 'dfa_diagram' | 'tree_diagram';
        content: string;
        position: string;
        color: string;
      }[];
      duration: number;
    }[];
  } | null;
  subjectTag?: string;
  difficultyLevel?: string;
  cached?: boolean;
  sessionId?: string;
  createdAt: string;
  streaming?: boolean;
}

export interface SendMessageResponse {
  userMessage: MessageItem;
  assistantMessage: MessageItem;
  sessionId: string;
  cached: boolean;
}

export type StreamEvent =
  | { type: 'user_saved'; message: MessageItem }
  | { type: 'token'; content: string }
  | { type: 'metadata'; keyPoints: string[]; chartData: MessageItem['chartData']; animationScript: MessageItem['animationScript']; videoScript: string; subjectTag: string; difficultyLevel: string; questionCategory: 'mathematical' | 'theoretical'; whiteboardScript: MessageItem['whiteboardScript'] }
  | { type: 'done'; message: MessageItem; sessionId: string; cached: boolean }
  | { type: 'error'; message: string };

// --- Chat API ---

export async function listChats(): Promise<ChatItem[]> {
  const { data } = await client.get('/api/chats');
  return data;
}

export async function createChat(): Promise<ChatItem> {
  const { data } = await client.post('/api/chats');
  return data;
}

export async function getChatMessages(chatId: string): Promise<MessageItem[]> {
  const { data } = await client.get(`/api/chats/${chatId}/messages`);
  return data;
}

export async function* sendMessageStream(
  chatId: string,
  question: string
): AsyncGenerator<StreamEvent> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API}/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = 'Something went wrong';
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || parsed.message || message;
    } catch {}
    throw new Error(message);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop()!;

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield data as StreamEvent;
        } catch {}
      }
    }
  }

  if (buffer.trim().startsWith('data: ')) {
    try {
      const data = JSON.parse(buffer.trim().slice(6));
      yield data as StreamEvent;
    } catch {}
  }
}

export async function* sendTempMessageStream(
  tempChatId: string,
  question: string
): AsyncGenerator<StreamEvent> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API}/api/chats/temp/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ tempChatId, question }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = 'Something went wrong';
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || parsed.message || message;
    } catch {}
    throw new Error(message);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop()!;

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield data as StreamEvent;
        } catch {}
      }
    }
  }

  if (buffer.trim().startsWith('data: ')) {
    try {
      const data = JSON.parse(buffer.trim().slice(6));
      yield data as StreamEvent;
    } catch {}
  }
}

export async function sendMessage(chatId: string, question: string): Promise<SendMessageResponse> {
  const { data } = await client.post(`/api/chats/${chatId}/messages`, { question });
  return data;
}

export async function deleteChat(chatId: string): Promise<void> {
  await client.delete(`/api/chats/${chatId}`);
}

export async function renameChat(chatId: string, title: string): Promise<ChatItem> {
  const { data } = await client.patch(`/api/chats/${chatId}`, { title });
  return data;
}

export async function listChatFolders(): Promise<ChatFolderItem[]> {
  const { data } = await client.get('/api/chats/folders');
  return data;
}

export async function createChatFolder(name: string): Promise<ChatFolderItem> {
  const { data } = await client.post('/api/chats/folders', { name });
  return data;
}

export async function moveChatToFolder(chatId: string, folderId: string | null): Promise<ChatItem> {
  const { data } = await client.patch(`/api/chats/${chatId}/folder`, { folderId });
  return data;
}

export async function deleteChatFolder(folderId: string): Promise<void> {
  await client.delete(`/api/chats/folders/${folderId}`);
}

// --- Analytics API ---

export interface HeatmapCell { date: string; count: number; intensity: number }

export interface AnalyticsStats {
  totalQuestions: number;
  totalChats: number;
  totalSubjects: number;
  weeklyQuestions: number;
  subjectBreakdown: { subject: string; count: number; percent: number }[];
  weeklyData: { label: string; count: number }[];
  recentActivity?: {
    rawQuestion: string;
    subjectTag: string;
    createdAt: string;
    chatId: string | null;
  }[];
}

export async function getHeatmap(): Promise<HeatmapCell[][]> {
  const { data } = await client.get('/api/analytics/heatmap');
  return data;
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const { data } = await client.get('/api/analytics/stats');
  return data;
}

// --- Profile API ---

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  institutionType: string;
  institutionName: string;
  gradeYear: string;
  createdAt: string;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await client.get('/api/profile');
  return data;
}

export interface RateLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
}

export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  const { data } = await client.get('/api/profile/rate-limit');
  return data;
}

export async function updateProfile(updates: Partial<Pick<UserProfile, 'name' | 'institutionType' | 'institutionName' | 'gradeYear'>>): Promise<UserProfile> {
  const { data } = await client.patch('/api/profile', updates);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await client.patch('/api/profile/password', { currentPassword, newPassword });
}

export const generateVideo = async (
  chatId: string,
  question: string,
  explanation: string,
  options?: { videoScript?: string; keyPoints?: string[] },
) => {
  const response = await client.post(`/api/chats/${chatId}/generate-video`, {
    question,
    explanation,
    videoScript: options?.videoScript,
    keyPoints: options?.keyPoints,
  });
  return response.data;
};

export default client;
