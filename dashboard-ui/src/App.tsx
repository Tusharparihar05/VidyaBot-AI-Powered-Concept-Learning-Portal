import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import KnowledgeVault from './pages/KnowledgeVault';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import HistoryPage from './pages/HistoryPage';  
import { useAuth } from './context/AuthContext';
import { Page } from './types';

function DashboardShell() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  useEffect(() => {
    if (window.location.pathname === '/signin') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const pageComponents: Record<Page, ReactNode> = {
    dashboard: <Dashboard />,
    knowledge: <KnowledgeVault />,
    analytics: <Analytics />,
    settings: <Settings />,
    history: <HistoryPage />, 
  };

  return (
    <div className="min-h-screen bg-[#f7f9f8] font-sans">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <Header activePage={activePage} />
      <main className="ml-16 pt-16 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {pageComponents[activePage]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9f8] text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <DashboardShell />;
}