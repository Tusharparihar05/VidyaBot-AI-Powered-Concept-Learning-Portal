import { motion } from 'framer-motion';
import { Home, BookOpen, BarChart2, Settings, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: React.ReactNode; label: string }[] = [
  { page: 'dashboard', icon: <Home size={20} />, label: 'Dashboard' },
  { page: 'knowledge', icon: <BookOpen size={20} />, label: 'Knowledge Vault' },
  { page: 'analytics', icon: <BarChart2 size={20} />, label: 'Study Stats' },
  { page: 'settings', icon: <Settings size={20} />, label: 'Settings' },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { profile } = useAuth();
  const displayName = profile?.displayName ?? 'User';

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-100 flex flex-col items-center py-6 z-50 shadow-sm">
      <div className="mb-8">
        <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
          <GraduationCap size={20} className="text-white" />
        </div>
      </div>

      <nav className="flex-1 flex flex-col items-center gap-2">
        {navItems.map(({ page, icon, label }) => {
          const isActive = activePage === page;
          return (
            <motion.button
              key={page}
              onClick={() => onNavigate(page)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={label}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                  : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
            >
              {icon}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -right-[17px] w-1 h-6 bg-emerald-500 rounded-l-full"
                />
              )}
              <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
          <img
            src={profile?.avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            title={displayName}
          />
        </div>
      </div>
    </aside>
  );
}
