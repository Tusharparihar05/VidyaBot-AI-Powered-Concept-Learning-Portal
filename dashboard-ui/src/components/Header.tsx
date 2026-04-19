import { Bell, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';

interface HeaderProps {
  activePage: Page;
}

const pageTitles: Record<Page, string> = {
  dashboard: 'Learning Dashboard',
  knowledge: 'Knowledge Vault',
  analytics: 'Study Analytics',
  settings: 'Settings',
};

const credits = 7;
const totalCredits = 10;

export default function Header({ activePage }: HeaderProps) {
  const { profile } = useAuth();
  const percentage = (credits / totalCredits) * 100;
  const displayName = profile?.displayName ?? 'Student';
  const classLine = profile?.classLine ?? '';

  return (
    <header className="fixed top-0 left-16 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-6 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">VidyaBot</span>
          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">AI</span>
        </div>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">{pageTitles[activePage]}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold text-gray-700">{credits}/{totalCredits} Credits</span>
          </div>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
        </button>

        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-gray-100 group-hover:border-emerald-300 transition-colors">
            <img
              src={profile?.avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-800 leading-none">{displayName}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{classLine}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
