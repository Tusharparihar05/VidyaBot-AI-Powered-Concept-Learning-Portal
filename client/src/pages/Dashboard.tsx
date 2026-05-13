import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Trash2, Sparkles, Search, ArrowRight, Loader2, Send, MoreVertical, FolderPlus,
  Folder, ChevronRight, FolderMinus,
} from 'lucide-react';
import { listChats, createChat, getChatMessages, sendMessageStream, sendTempMessageStream, deleteChat, listChatFolders, createChatFolder, moveChatToFolder, deleteChatFolder, type ChatItem, type ChatFolderItem, type MessageItem } from '../services/api';
import MessageBubble from '../components/dashboard/MessageBubble';
import { RATE_LIMIT_REFRESH_EVENT } from '../constants/rateLimitEvents';

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
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMeta, setStreamingMeta] = useState<Partial<MessageItem> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const streamingMetaRef = useRef<Partial<MessageItem> | null>(null);

  useEffect(() => {
    listChats()
      .then(data => { setChats(data); setLoadingChats(false); })
      .catch(() => setLoadingChats(false));
    listChatFolders().then(setFolders).catch(() => {
      void 0;
    });
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
    } catch {
      void 0;
    }
  }, [temporaryMode]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch {
      void 0;
    }
  }, [activeChatId]);

  const handleRemoveFromFolder = useCallback(async (chatId: string) => {
    try {
      const updated = await moveChatToFolder(chatId, null);
      setChats(prev =>
        prev.map(c =>
          c._id === chatId ? { ...c, folderId: updated.folderId ?? null } : c,
        ),
      );
    } catch {
      void 0;
    }
  }, []);

  const handleDeleteFolder = useCallback(async (folderId: string, folderName: string) => {
    if (
      !window.confirm(
        `Delete folder "${folderName}"? Chats inside will stay in your sidebar as Unfiled (not deleted).`,
      )
    ) {
      return;
    }
    try {
      await deleteChatFolder(folderId);
      setFolders(prev => prev.filter(f => f._id !== folderId));
      setChats(prev => prev.map(c => (c.folderId === folderId ? { ...c, folderId: null } : c)));
      setCollapsedFolders(prev => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
    } catch {
      void 0;
    }
  }, []);

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
    } catch {
      void 0;
    }
  }, [folders]);

  const { folderGroups, unfiledChats } = useMemo(() => {
    const byFolder = new Map<string, ChatItem[]>();
    for (const f of folders) byFolder.set(f._id, []);
    const unfiled: ChatItem[] = [];
    const knownFolderIds = new Set(folders.map(f => f._id));
    for (const c of chats) {
      if (c.folderId && knownFolderIds.has(c.folderId)) {
        byFolder.get(c.folderId)!.push(c);
      } else {
        unfiled.push(c);
      }
    }
    const folderGroups = folders
      .map(f => ({ folder: f, chats: byFolder.get(f._id) || [] }))
      .filter(g => g.chats.length > 0);
    return { folderGroups, unfiledChats: unfiled };
  }, [chats, folders]);

  const toggleFolderCollapsed = useCallback((folderId: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  }, []);

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
    streamingMetaRef.current = null;

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
            streamingMetaRef.current = {
              keyPoints: event.keyPoints,
              chartData: event.chartData,
              animationScript: event.animationScript,
              videoScript: event.videoScript,
              subjectTag: event.subjectTag,
              difficultyLevel: event.difficultyLevel,
              questionCategory: event.questionCategory,
              whiteboardScript: event.whiteboardScript,
            };
            setStreamingMeta(streamingMetaRef.current);
            break;

          case 'done': {
            setStreamingContent('');
            const meta = streamingMetaRef.current;
            streamingMetaRef.current = null;
            setStreamingMeta(null);
            const merged: MessageItem = { ...event.message };
            if (meta) {
              const patch = meta as Partial<MessageItem>;
              if (!merged.whiteboardScript && patch.whiteboardScript) merged.whiteboardScript = patch.whiteboardScript;
              if (!merged.questionCategory && patch.questionCategory) merged.questionCategory = patch.questionCategory;
              if (!merged.chartData && patch.chartData) merged.chartData = patch.chartData;
              if ((!merged.keyPoints || merged.keyPoints.length === 0) && patch.keyPoints?.length) merged.keyPoints = patch.keyPoints;
              if (!merged.animationScript?.length && patch.animationScript?.length) merged.animationScript = patch.animationScript;
              if (!merged.videoScript && patch.videoScript) merged.videoScript = patch.videoScript;
              if (!merged.subjectTag && patch.subjectTag) merged.subjectTag = patch.subjectTag;
              if (!merged.difficultyLevel && patch.difficultyLevel) merged.difficultyLevel = patch.difficultyLevel;
            }
            setMessages(prev => [...prev, merged]);
            if (!temporaryMode) {
              setChats(prev => prev.map(c =>
                c._id === chatId
                  ? { ...c, title: c.messageCount === 0 ? q.slice(0, 60) : c.title, messageCount: c.messageCount + 2, lastMessageAt: new Date().toISOString() }
                  : c
              ));
            }
            break;
          }

          case 'error': {
            setStreamingContent('');
            setStreamingMeta(null);
            streamingMetaRef.current = null;
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
      streamingMetaRef.current = null;
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

    window.dispatchEvent(new CustomEvent(RATE_LIMIT_REFRESH_EVENT));
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
            <>
              {folderGroups.map(({ folder, chats: folderChats }) => {
                const collapsed = !!collapsedFolders[folder._id];
                return (
                  <div key={folder._id} className="mb-2">
                    <div className="flex items-center gap-0.5 w-full px-1 py-0.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gpai-surface-2/80 transition-colors group/folderhead">
                      <button
                        type="button"
                        onClick={() => toggleFolderCollapsed(folder._id)}
                        className="flex flex-1 items-center gap-1.5 min-w-0 py-1 pl-1 pr-0.5 rounded-md text-left"
                      >
                        <ChevronRight
                          size={14}
                          className={`shrink-0 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                        />
                        <Folder size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate flex-1 min-w-0">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gpai-muted shrink-0">{folderChats.length}</span>
                      </button>
                      <button
                        type="button"
                        title="Delete folder"
                        aria-label={`Delete folder ${folder.name}`}
                        onClick={e => {
                          e.stopPropagation();
                          void handleDeleteFolder(folder._id, folder.name);
                        }}
                        className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-80 group-hover/folderhead:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {!collapsed && folderChats.map(chat => (
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
                          <div className="absolute right-2 top-9 z-20 bg-white dark:bg-gpai-surface-2 border border-gray-200 dark:border-gpai-border rounded-lg shadow-lg py-1 min-w-40">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setMenuChatId(null);
                                void handleRemoveFromFolder(chat._id);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gpai-surface flex items-center gap-2"
                            >
                              <FolderMinus size={12} /> Remove from folder
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setMenuChatId(null); void handleAddToFolder(chat._id); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gpai-surface flex items-center gap-2"
                            >
                              <FolderPlus size={12} /> Move folder…
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setMenuChatId(null); void handleDeleteChat(chat._id); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 size={12} /> Delete Chat
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {unfiledChats.length > 0 && (
                <div className={folderGroups.length ? 'mt-2 pt-2 border-t border-gray-100 dark:border-gpai-border' : ''}>
                  {folderGroups.length > 0 && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gpai-muted px-2 mb-1">Unfiled</p>
                  )}
                  {unfiledChats.map(chat => (
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
                        <div className="absolute right-2 top-9 z-20 bg-white dark:bg-gpai-surface-2 border border-gray-200 dark:border-gpai-border rounded-lg shadow-lg py-1 min-w-36">
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setMenuChatId(null); void handleAddToFolder(chat._id); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gpai-surface flex items-center gap-2"
                          >
                            <FolderPlus size={12} /> Add to Folder
                          </button>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setMenuChatId(null); void handleDeleteChat(chat._id); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Delete Chat
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
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
