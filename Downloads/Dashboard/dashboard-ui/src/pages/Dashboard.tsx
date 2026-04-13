import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, Flame } from 'lucide-react';
import SearchHero from '../components/dashboard/SearchHero';
import PipelineStatus from '../components/dashboard/PipelineStatus';
import OutputPanels from '../components/dashboard/OutputPanels';
import RefineModal from '../components/dashboard/RefineModal';
import { recentTopics } from '../data/mockData';

export default function Dashboard() {
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'processing' | 'complete'>('idle');
  const [activeStage, setActiveStage] = useState(0);
  const [topic, setTopic] = useState('');
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');

  const handleSearch = (query: string) => {
    setPendingQuery(query);
    setShowRefineModal(true);
  };

  const handleConfirmSearch = (enhancedQuery: string) => {
    setShowRefineModal(false);
    setTopic(enhancedQuery.split('(')[0].trim() || pendingQuery);
    setPipelineStatus('processing');
    setActiveStage(0);

    const stageDelay = 1200;
    setTimeout(() => setActiveStage(1), stageDelay);
    setTimeout(() => setActiveStage(2), stageDelay * 2);
    setTimeout(() => {
      setPipelineStatus('complete');
    }, stageDelay * 3);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: 'Day Streak', value: '12 days', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' },
          { icon: BookOpen, label: 'Topics Learned', value: '47', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
          { icon: Clock, label: 'Hours Saved', value: '23.5 hrs', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${stat.bg}`}
            >
              <Icon size={18} className={stat.color} />
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-sm font-bold text-gray-800">{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
      >
        <SearchHero onSearch={handleSearch} isProcessing={pipelineStatus === 'processing'} />
      </motion.div>

      {pipelineStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">Pipeline Status</p>
          <PipelineStatus status={pipelineStatus} activeStage={activeStage} />
        </motion.div>
      )}

      {pipelineStatus === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">Output Pipeline</p>
          <PipelineStatus status="idle" activeStage={0} />
        </motion.div>
      )}

      <OutputPanels status={pipelineStatus} topic={topic || 'Quantum Entanglement'} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Recent Sessions</h3>
          <button className="text-xs text-emerald-600 font-semibold hover:text-emerald-700">View all</button>
        </div>
        <div className="space-y-2">
          {recentTopics.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-emerald-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 group-hover:border-emerald-200 flex items-center justify-center">
                <BookOpen size={14} className="text-gray-500 group-hover:text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-400">{t.subject} · {t.time}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
                <Flame size={10} />
                {t.credits}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <RefineModal
        isOpen={showRefineModal}
        onClose={() => setShowRefineModal(false)}
        onConfirm={handleConfirmSearch}
        rawPrompt={pendingQuery}
      />
    </motion.div>
  );
}
