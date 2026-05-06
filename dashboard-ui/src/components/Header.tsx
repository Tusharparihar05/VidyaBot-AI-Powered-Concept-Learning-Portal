import { useState, useEffect } from 'react';
import { Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Page } from '../types';
import { getAnalyticsStats } from '../services/api';

interface HeaderProps {
  activePage: Page;
}

const pageTitles: Record<Page, string> = {
  dashboard: 'Learning Dashboard',
  knowledge: 'Knowledge Vault',
  analytics: 'Study Analytics',
  settings: 'Settings',
  history: 'My History',
};

export default function Header({ activePage }: HeaderProps) {
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const displayName = profile?.displayName ?? 'Student';
  const classLine = profile?.classLine ?? '';

  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    getAnalyticsStats()
      .then(s => setTotalQuestions(s.totalQuestions))
      .catch(() => {});
  }, [activePage]);

  return (
    <header className="fixed top-0 left-16 right-0 h-16 bg-white dark:bg-gpai-surface border-b border-gray-100 dark:border-gpai-border flex items-center px-6 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900 dark:text-white">VidyaBot</span>
          <span className="text-xs font-medium bg-gpai-primary-soft text-gpai-primary px-2 py-0.5 rounded-full">AI</span>
        </div>
        <span className="text-gray-300 dark:text-gpai-border">|</span>
        <span className="text-sm text-gray-500 dark:text-gpai-muted">{pageTitles[activePage]}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gpai-surface-2 border border-gray-100 dark:border-gpai-border rounded-2xl px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{totalQuestions} Questions</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gpai-surface-2 border border-gray-100 dark:border-gpai-border flex items-center justify-center hover:bg-gpai-primary-soft hover:border-gpai-primary/40 transition-colors"
        >
          {theme === 'dark'
            ? <Sun size={15} className="text-amber-300" />
            : <Moon size={15} className="text-indigo-500" />
          }
        </button>

        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-gray-100 dark:border-gpai-border group-hover:border-gpai-primary/40 transition-colors">
            <img
              src={profile?.avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-none">{displayName}</p>
            <p className="text-[10px] text-gray-400 dark:text-gpai-muted mt-0.5">{classLine}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
