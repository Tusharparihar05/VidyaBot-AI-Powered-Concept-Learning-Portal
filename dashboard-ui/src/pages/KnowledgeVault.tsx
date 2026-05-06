import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Loader2, MessageSquare, Clock, Cpu, Zap, BarChart2, Globe, FlaskConical } from 'lucide-react';
import { listChats, type ChatItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface HistoryItem {
  _id: string;
  rawQuestion: string;
  subjectTag: string;
  textAnswer: string;
  createdAt: string;
}

const subjectIcons: Record<string, React.ReactNode> = {
  computer_science: <Cpu size={18} />,
  physics: <Zap size={18} />,
  mathematics: <BarChart2 size={18} />,
  chemistry: <FlaskConical size={18} />,
  biology: <Globe size={18} />,
  general: <BookOpen size={18} />,
  history: <BookOpen size={18} />,
  economics: <BarChart2 size={18} />,
};

const subjectColors: Record<string, { bg: string; border: string; icon: string; folder: string }> = {
  computer_science: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600', folder: 'bg-blue-100' },
  physics: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600', folder: 'bg-amber-100' },
  mathematics: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-600', folder: 'bg-indigo-100' },
  chemistry: { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'text-rose-600', folder: 'bg-rose-100' },
  biology: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600', folder: 'bg-emerald-100' },
  general: { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-600', folder: 'bg-slate-100' },
  history: { bg: 'bg-teal-50', border: 'border-teal-100', icon: 'text-teal-600', folder: 'bg-teal-100' },
  economics: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-600', folder: 'bg-orange-100' },
};

const defaultColors = { bg: 'bg-gray-50', border: 'border-gray-100', icon: 'text-gray-600', folder: 'bg-gray-100' };

interface KnowledgeVaultProps {
  onOpenChat?: (chatId: string) => void;
}

export default function KnowledgeVault({ onOpenChat }: KnowledgeVaultProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const { session } = useAuth();
  const token = session?.token;

  useEffect(() => {
    if (!token) return;

    const fetchAll = async () => {
      try {
        const [chatData, historyRes, tagRes] = await Promise.all([
          listChats(),
          axios.get(`${API}/api/history`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/history/tags`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setChats(chatData);
        setHistory(historyRes.data);
        setTags(tagRes.data);
      } catch {}
      setLoading(false);
    };

    fetchAll();
  }, [token]);

  const subjectGroups = tags.map(tag => {
    const items = history.filter(h => h.subjectTag === tag);
    return { tag, count: items.length };
  });

  const filteredHistory = history.filter(item => {
    const matchTag = !selectedTag || item.subjectTag === selectedTag;
    const matchSearch = !searchQuery || item.rawQuestion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTag && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300 dark:text-gpai-muted" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Vault</h2>
        <p className="text-sm text-gray-500 dark:text-gpai-muted mt-0.5">Your organized learning library</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gpai-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search your questions..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gpai-surface border border-gray-200 dark:border-gpai-border rounded-2xl text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-gpai-primary focus:ring-2 focus:ring-gpai-primary/20 transition-all"
        />
      </div>

      {/* Subject Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedTag('')}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
            !selectedTag
              ? 'bg-gpai-primary text-white border-gpai-primary'
              : 'bg-white dark:bg-gpai-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gpai-border hover:border-gpai-primary/40 hover:text-gpai-primary'
          }`}
        >
          All ({history.length})
        </button>
        {subjectGroups.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all capitalize ${
              selectedTag === tag
                ? 'bg-gpai-primary text-white border-gpai-primary'
                : 'bg-white dark:bg-gpai-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gpai-border hover:border-gpai-primary/40 hover:text-gpai-primary'
            }`}
          >
            {tag.replace('_', ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Subject Cards */}
      {!selectedTag && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Subjects</h3>
            <span className="text-xs text-gray-400 dark:text-gpai-muted bg-gray-100 dark:bg-gpai-surface-2 px-2 py-0.5 rounded-full">{subjectGroups.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectGroups.map(({ tag, count }, i) => {
              const colors = subjectColors[tag] || defaultColors;
              const icon = subjectIcons[tag] || <BookOpen size={18} />;
              return (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setSelectedTag(tag)}
                  className={`${colors.bg} ${colors.border} dark:bg-gpai-surface dark:border-gpai-border border rounded-3xl p-5 cursor-pointer hover:-translate-y-1 transition-transform`}
                >
                  <div className={`${colors.folder} dark:bg-gpai-primary-soft rounded-2xl p-3 ${colors.icon} dark:text-gpai-primary w-fit mb-3`}>
                    {icon}
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 capitalize">{tag.replace('_', ' ')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gpai-muted mt-1">{count} question{count !== 1 ? 's' : ''}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedTag ? `${selectedTag.replace('_', ' ')} Questions` : 'Recent Questions'}</h3>
          <span className="text-xs text-gray-400 dark:text-gpai-muted bg-gray-100 dark:bg-gpai-surface-2 px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gpai-muted py-8 text-center">No questions found. Start learning on the Dashboard!</p>
        ) : (
          <div className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm divide-y divide-gray-50 dark:divide-gpai-border">
            {filteredHistory.slice(0, 20).map((item, i) => {
              const colors = subjectColors[item.subjectTag] || defaultColors;
              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gpai-surface-2 cursor-pointer transition-colors first:rounded-t-3xl last:rounded-b-3xl"
                >
                  <div className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.border} dark:bg-gpai-surface-2 dark:border-gpai-border border flex items-center justify-center shrink-0`}>
                    <BookOpen size={15} className={`${colors.icon} dark:text-gpai-primary`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.rawQuestion}</p>
                    <p className="text-xs text-gray-400 dark:text-gpai-muted truncate mt-0.5">
                      {item.textAnswer ? item.textAnswer.slice(0, 80) + '...' : 'No answer'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-medium bg-gray-100 dark:bg-gpai-surface-2 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full capitalize">{item.subjectTag}</span>
                    <p className="text-[10px] text-gray-400 dark:text-gpai-muted mt-1 flex items-center gap-0.5 justify-end">
                      <Clock size={9} /> {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Chats */}
      {chats.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Active Chats</h3>
            <span className="text-xs text-gray-400 dark:text-gpai-muted bg-gray-100 dark:bg-gpai-surface-2 px-2 py-0.5 rounded-full">{chats.length}</span>
          </div>
          <div className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm divide-y divide-gray-50 dark:divide-gpai-border">
            {chats.slice(0, 10).map((chat, i) => (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gpai-surface-2 transition-colors first:rounded-t-3xl last:rounded-b-3xl cursor-pointer"
                onClick={() => onOpenChat?.(chat._id)}
              >
                <div className="w-9 h-9 rounded-xl bg-gpai-primary-soft border border-gpai-primary/20 flex items-center justify-center">
                  <MessageSquare size={15} className="text-gpai-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{chat.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gpai-muted">{chat.messageCount} messages · {chat.subjectTag}</p>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gpai-muted">
                  {new Date(chat.lastMessageAt).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
