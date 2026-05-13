import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, Sparkles, Search, ArrowRight, Loader2, Send, MoreVertical, FolderPlus } from 'lucide-react';
import { listChats, createChat, getChatMessages, sendMessageStream, sendTempMessageStream, deleteChat, listChatFolders, createChatFolder, moveChatToFolder, type ChatItem, type ChatFolderItem, type MessageItem } from '../services/api';
import MessageBubble from '../components/dashboard/MessageBubble';

const suggestions = [
  'Explain Quantum Entanglement',
  'How does DNA replication work?',
  'Solve a binary search tree problem',
  "Newton's laws of motion with examples",
];

interface DashboardProps {
  openChatId?: string | null;
  onOpenChatHandled?: () => void;
}

export default function Dashboard({ openChatId = null, onOpenChatHandled }: DashboardProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [temporaryMode, setTemporaryMode] = useState(false);
  const [tempChatId, setTempChatId] = useState<string>('temp-default');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [folders, setFolders] = useState<ChatFolderItem[]>([]);
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMeta, setStreamingMeta] = useState<Partial<MessageItem> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listChats()
      .then(data => { setChats(data); setLoadingChats(false); })
      .catch(() => setLoadingChats(false));
    listChatFolders().then(setFolders).catch(() => {});
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    setActiveChatId(chatId);
    setLoadingMessages(true);
    try {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
    } catch { setMessages([]); }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (openChatId) {
      void loadMessages(openChatId);
      onOpenChatHandled?.();
    }
  }, [openChatId, loadMessages, onOpenChatHandled]);

  const handleNewChat = useCallback(async () => {
    if (temporaryMode) {
      setTempChatId(`temp-${Date.now()}`);
      setActiveChatId(null);
      setMessages([]);
      return;
    }
    try {
      const chat = await createChat();
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat._id);
      setMessages([]);
    } catch {}
  }, [temporaryMode]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch {}
  }, [activeChatId]);

  const handleAddToFolder = useCallback(async (chatId: string) => {
    const existing = folders.map(f => f.name).join(', ');
    const input = window.prompt(
      existing
        ? `Enter folder name. Existing folders: ${existing}`
        : 'Enter folder name for this chat:'
    );
    if (!input || !input.trim()) return;
    const name = input.trim();

    let folder = folders.find(f => f.name.toLowerCase() === name.toLowerCase()) || null;
    if (!folder) {
      try {
        folder = await createChatFolder(name);
        setFolders(prev => [folder!, ...prev]);
      } catch {
        return;
      }
    }

    try {
      const updated = await moveChatToFolder(chatId, folder._id);
      setChats(prev => prev.map(c => (c._id === chatId ? { ...c, folderId: updated.folderId } : c)));
    } catch {}
  }, [folders]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSend = useCallback(async (text?: string) => {
    const q = (text || query).trim();
    if (!q || sending) return;

    let chatId = activeChatId;

    if (!temporaryMode && !chatId) {
      try {
        const chat = await createChat();
        setChats(prev => [chat, ...prev]);
        chatId = chat._id;
        setActiveChatId(chatId);
      } catch { return; }
    }

    setQuery('');
    setSending(true);
    setStreamingContent('');
    setStreamingMeta(null);

    const tempUserMsg: MessageItem = {
      _id: `temp-user-${Date.now()}`,
      chatId: chatId!,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      let accumulatedContent = '';

      const stream = temporaryMode
        ? sendTempMessageStream(tempChatId, q)
        : sendMessageStream(chatId!, q);

      for await (const event of stream) {
        switch (event.type) {
          case 'user_saved':
            setMessages(prev =>
              prev.map(m => m._id === tempUserMsg._id ? event.message : m)
            );
            break;

          case 'token':
            accumulatedContent += event.content;
            setStreamingContent(accumulatedContent);
            break;

          case 'metadata':
            setStreamingMeta({
              keyPoints: event.keyPoints,
              chartData: event.chartData,
              animationScript: event.animationScript,
              videoScript: event.videoScript,
              subjectTag: event.subjectTag,
              difficultyLevel: event.difficultyLevel,
              questionCategory: event.questionCategory,
              whiteboardScript: event.whiteboardScript,
            });
            break;

          case 'done':
            setStreamingContent('');
            setStreamingMeta(null);
            setMessages(prev => [...prev, event.message]);
            if (!temporaryMode) {
              setChats(prev => prev.map(c =>
                c._id === chatId
                  ? { ...c, title: c.messageCount === 0 ? q.slice(0, 60) : c.title, messageCount: c.messageCount + 2, lastMessageAt: new Date().toISOString() }
                  : c
              ));
            }
            break;

          case 'error': {
            setStreamingContent('');
            setStreamingMeta(null);
            const errorMsg: MessageItem = {
              _id: `error-${Date.now()}`,
              chatId: chatId!,
              role: 'assistant',
              content: `Error: ${event.message}`,
              createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMsg]);
            break;
          }
        }
      }
    } catch (err: unknown) {
      setStreamingContent('');
      setStreamingMeta(null);
      let message = 'Something went wrong';
      if (err instanceof Error) message = err.message;
      const errorMsg: MessageItem = {
        _id: `error-${Date.now()}`,
        chatId: chatId!,
        role: 'assistant',
        content: `Error: ${message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setSending(false);
  }, [query, sending, activeChatId, temporaryMode, tempChatId]);

  const streamingMessage: MessageItem | null = streamingContent ? {
    _id: 'streaming',
    chatId: activeChatId || '',
    role: 'assistant',
    content: streamingContent,
    streaming: true,
    ...(streamingMeta || {}),
    createdAt: new Date().toISOString(),
  } : null;

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Chat Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-64 shrink-0 bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm flex flex-col overflow-hidden"
      >
        <div className="p-3 border-b border-gray-100 dark:border-gpai-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gpai-primary hover:bg-gpai-primary-hover text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={15} /> New Chat
          </button>
          <button
            onClick={() => {
              setTemporaryMode(prev => !prev);
              setMessages([]);
              setActiveChatId(null);
              setTempChatId(`temp-${Date.now()}`);
            }}
            className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-semibold transition-colors ${
              temporaryMode
                ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gpai-surface-2 dark:text-gray-200 dark:border-gpai-border dark:hover:bg-gpai-border'
            }`}
          >
            {temporaryMode ? 'Temporary Chat: ON' : 'Temporary Chat: OFF'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-gray-300 dark:text-gpai-muted" />
            </div>
          ) : chats.length === 0 || temporaryMode ? (
            <p className="text-xs text-gray-400 dark:text-gpai-muted text-center py-8">
              {temporaryMode ? 'Temporary mode — chats are not stored' : 'No chats yet'}
            </p>
          ) : (
            chats.map(chat => (
              <div
                key={chat._id}
                onClick={() => loadMessages(chat._id)}
                className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-left w-full ${
                  activeChatId === chat._id
                    ? 'bg-gpai-primary-soft border border-gpai-primary/30'
                    : 'hover:bg-gpai-primary-soft/40 border border-transparent'
                }`}
              >
                <MessageSquare size={14} className={activeChatId === chat._id ? 'text-gpai-primary shrink-0' : 'text-gray-400 dark:text-gpai-muted shrink-0'} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{chat.title}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gpai-muted">{chat.messageCount} msgs</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setMenuChatId(prev => prev === chat._id ? null : chat._id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gpai-muted hover:text-gray-500 dark:hover:text-gray-200 transition-all shrink-0"
                >
                  <MoreVertical size={12} />
                </button>
                {menuChatId === chat._id && (
                  <div className="absolute right-2 mt-16 z-20 bg-white dark:bg-gpai-surface-2 border border-gray-200 dark:border-gpai-border rounded-lg shadow-lg py-1 min-w-36">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuChatId(null); void handleAddToFolder(chat._id); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gpai-surface flex items-center gap-2"
                    >
                      <FolderPlus size={12} /> Add to Folder
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuChatId(null); void handleDeleteChat(chat._id); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 size={12} /> Delete Chat
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm overflow-hidden">
        {!activeChatId && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">What would you like to learn today?</h1>
                <p className="text-gray-500 dark:text-gpai-muted text-sm mt-1">VidyaBot will generate structured notes, charts, animations, and a virtual teacher.</p>
              </div>

              <div className="relative">
                <div className="flex items-center bg-white dark:bg-gpai-surface-2 rounded-2xl border-2 border-gray-200 dark:border-gpai-border focus-within:border-gpai-primary focus-within:shadow-lg focus-within:shadow-gpai-primary/15 transition-all shadow-sm">
                  <Search size={18} className="ml-4 text-gray-400 dark:text-gpai-muted shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="e.g. 'Explain Quantum Entanglement'"
                    className="flex-1 py-4 px-3 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gpai-muted"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={sending || !query.trim()}
                    className="m-1.5 px-5 py-2.5 bg-gpai-primary hover:bg-gpai-primary-hover disabled:bg-gray-200 dark:disabled:bg-gpai-surface-2 disabled:text-gray-400 dark:disabled:text-gpai-muted text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(s); handleSend(s); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-300 bg-white dark:bg-gpai-surface-2 border border-gray-200 dark:border-gpai-border hover:border-gpai-primary/40 hover:text-gpai-primary hover:bg-gpai-primary-soft px-3 py-1.5 rounded-full transition-all"
                  >
                    <ArrowRight size={10} /> {s}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-gray-300 dark:text-gpai-muted" />
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map(msg => (
                    <MessageBubble key={msg._id} message={msg} />
                  ))}
                  {streamingMessage && (
                    <MessageBubble key="streaming" message={streamingMessage} />
                  )}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gpai-border">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gpai-surface-2 rounded-2xl px-4 py-2 border border-gray-200 dark:border-gpai-border focus-within:border-gpai-primary transition-colors">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gpai-muted py-1"
                  disabled={sending}
                />
                {sending ? (
                  <Loader2 size={16} className="animate-spin text-gray-400 dark:text-gpai-muted" />
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!query.trim()}
                    className="w-8 h-8 bg-gpai-primary hover:bg-gpai-primary-hover disabled:bg-gray-200 dark:disabled:bg-gpai-surface-2 rounded-xl flex items-center justify-center text-white transition-colors"
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
