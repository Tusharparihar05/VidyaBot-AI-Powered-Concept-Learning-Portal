import { motion } from 'framer-motion';
import { MoreHorizontal, Plus, Search, Cpu, Zap, BarChart2, Globe, BookOpen, FlaskConical } from 'lucide-react';
import { knowledgeFolders } from '../data/mockData';

const colorMap: Record<string, { bg: string; border: string; icon: string; folder: string }> = {
  mint: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600', folder: 'bg-emerald-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600', folder: 'bg-blue-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600', folder: 'bg-amber-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'text-rose-600', folder: 'bg-rose-100' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-100', icon: 'text-teal-600', folder: 'bg-teal-100' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-600', folder: 'bg-slate-100' },
};

const iconMap: Record<string, React.ReactNode> = {
  'cpu': <Cpu size={18} />,
  'zap': <Zap size={18} />,
  'bar-chart-2': <BarChart2 size={18} />,
  'flask-conical': <FlaskConical size={18} />,
  'globe': <Globe size={18} />,
  'book-open': <BookOpen size={18} />,
};

function FolderCard({ folder, index }: { folder: typeof knowledgeFolders[0]; index: number }) {
  const colors = colorMap[folder.color] || colorMap.mint;
  const icon = iconMap[folder.icon] || <BookOpen size={18} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`${colors.bg} ${colors.border} border rounded-3xl p-5 cursor-pointer group relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-8 translate-x-8"
        style={{ background: `radial-gradient(circle, currentColor, transparent)` }} />

      <div className="flex items-start justify-between mb-4">
        <div className={`${colors.folder} rounded-2xl p-3 ${colors.icon}`}>
          {icon}
        </div>
        <button className="w-7 h-7 rounded-lg bg-white/60 hover:bg-white flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-gray-800">{folder.title}</h3>
        <p className="text-xs text-gray-500">{folder.subject}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {[...Array(Math.min(3, Math.ceil(folder.itemCount / 8)))].map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-white border-2 border-white overflow-hidden">
                <div className={`w-full h-full ${colors.folder} rounded-full`} />
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500">{folder.itemCount} items</span>
        </div>
        <span className="text-[10px] text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">{folder.lastAccessed}</span>
      </div>
    </motion.div>
  );
}

export default function KnowledgeVault() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Knowledge Vault</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your organized learning library</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold shadow-md shadow-emerald-200 transition-colors"
        >
          <Plus size={15} />
          New Folder
        </motion.button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search knowledge vault..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['All Subjects', 'BTech CSE', 'Physics', 'Mathematics', 'Chemistry', 'Humanities'].map((tag, i) => (
          <button
            key={i}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              i === 0
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-800">Folders</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{knowledgeFolders.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeFolders.map((folder, i) => (
            <FolderCard key={folder.id} folder={folder} index={i} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-800">Recent Sessions</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">7</span>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[
            { title: 'Quantum Entanglement', subject: 'Physics', time: '2h ago', type: 'Full Analysis' },
            { title: 'Binary Search Trees', subject: 'Computer Science', time: '1d ago', type: 'Notes + Chart' },
            { title: 'Organic Reactions', subject: 'Chemistry', time: '3d ago', type: 'Animation' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors first:rounded-t-3xl last:rounded-b-3xl"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <BookOpen size={15} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-400">{item.subject} · {item.time}</p>
              </div>
              <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{item.type}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
