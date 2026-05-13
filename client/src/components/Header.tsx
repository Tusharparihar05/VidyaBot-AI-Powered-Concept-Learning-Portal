import { useState, useEffect, useCallback } from 'react';
import { Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Page } from '../types';
import { getRateLimitStatus, type RateLimitStatus } from '../services/api';
import { RATE_LIMIT_REFRESH_EVENT } from '../constants/rateLimitEvents';

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

  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);

  const refreshRateLimit = useCallback(() => {
    getRateLimitStatus()
      .then(setRateLimit)
      .catch(() => {
        void 0;
      });
  }, []);

  useEffect(() => {
    refreshRateLimit();
  }, [activePage, refreshRateLimit]);

  useEffect(() => {
    window.addEventListener(RATE_LIMIT_REFRESH_EVENT, refreshRateLimit);
    return () => window.removeEventListener(RATE_LIMIT_REFRESH_EVENT, refreshRateLimit);
  }, [refreshRateLimit]);

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
        <div
          className="flex items-center gap-3 bg-gray-50 dark:bg-gpai-surface-2 border border-gray-100 dark:border-gpai-border rounded-2xl px-4 py-2"
          title={
            rateLimit?.resetAt
              ? `Daily limit (UTC). Resets after ${new Date(rateLimit.resetAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`
              : 'Questions remaining today'
          }
        >
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            {rateLimit ? (
              <span className="text-xs font-semibold tabular-nums">
                <span
                  className={
                    rateLimit.remaining <= 0
                      ? 'text-red-600 dark:text-red-400'
                      : rateLimit.remaining <= Math.ceil(rateLimit.limit * 0.2)
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-800 dark:text-gray-100'
                  }
                >
                  {rateLimit.remaining}
                </span>
                <span className="text-gray-500 dark:text-gpai-muted font-medium"> / {rateLimit.limit}</span>
                <span className="text-gray-500 dark:text-gpai-muted font-normal hidden sm:inline"> left today</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-400 dark:text-gpai-muted">…</span>
            )}
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
