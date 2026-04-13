import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, User, BarChart2, BookmarkCheck, Pen, Play, Pause, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import SkeletonCard from './SkeletonCard';

interface OutputPanelsProps {
  status: 'idle' | 'processing' | 'complete';
  topic: string;
}

const tabs = [
  { id: 'text', label: 'Notes', icon: FileText },
  { id: 'animation', label: 'Animation', icon: Video },
  { id: 'avatar', label: 'Teacher', icon: User },
];

function TextPanel({ topic }: { topic: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText size={14} className="text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Structured Notes</span>
        </div>
        <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Generated</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
          <div className="flex items-end justify-between gap-1 h-28">
            {[40, 65, 35, 80, 55, 90, 45, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t-md bg-emerald-400/70 hover:bg-emerald-500 transition-colors cursor-pointer"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-emerald-700 font-medium mt-2">Key Concept Complexity Chart</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-800">{topic}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Quantum entanglement is a phenomenon where two or more particles become correlated in such a way that the quantum state of each particle cannot be described independently of the others...
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Superposition', 'Correlation', 'Bell\'s Theorem'].map((t, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-2 text-center">
              <BarChart2 size={14} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-gray-600">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimationPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = ['Introduction', 'Core Concepts', 'EPR Paradox', 'Applications'];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Video size={14} className="text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Explainer Animation</span>
        </div>
        <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">4 Slides</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(52,211,153,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.15),transparent_60%)]" />
          <div className="text-center z-10">
            <div className="text-4xl mb-2">⚛️</div>
            <p className="text-white text-xs font-semibold">Slide {activeSlide + 1}: {slides[activeSlide]}</p>
            <p className="text-slate-400 text-[10px] mt-1">Quantum Entanglement</p>
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute bottom-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button className="absolute top-3 right-3 w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors">
            <Maximize2 size={11} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                activeSlide === i
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >
              <BookmarkCheck size={9} />
              <span className="truncate">{s}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
            <Play size={11} />
          </button>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
            <div className="h-full w-1/3 bg-blue-400 rounded-full" />
          </div>
          <button className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
            <SkipForward size={11} />
          </button>
          <Volume2 size={12} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">1:24 / 4:10</span>
        </div>
      </div>
    </div>
  );
}

function AvatarPanel() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <User size={14} className="text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Virtual Teacher</span>
        </div>
        <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Live</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl aspect-video flex items-center justify-center relative border border-amber-100 overflow-hidden">
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/80 rounded-full px-2 py-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-gray-700">LIVE</span>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center mx-auto mb-2 shadow-lg">
              <User size={28} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-gray-800">Prof. VidyaBot</p>
            <p className="text-[10px] text-gray-500">Quantum Physics Expert</p>
          </div>
          <button className="absolute bottom-3 right-3 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors shadow-sm">
            <Pause size={12} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Pen size={11} className="text-slate-600" />
              <span className="text-[10px] font-bold text-slate-700">Whiteboard</span>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 bg-slate-200 rounded" />
              <div className="h-1.5 bg-slate-200 rounded w-4/5" />
              <div className="h-1.5 bg-emerald-200 rounded w-2/3" />
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={11} className="text-slate-600" />
              <span className="text-[10px] font-bold text-slate-700">Key Points</span>
            </div>
            <div className="space-y-1">
              {['Superposition', 'Correlation', 'Non-locality'].map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-[9px] text-gray-600">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          <p className="text-[10px] text-emerald-700 italic">"Imagine two coins that always show opposite faces no matter how far apart they are..."</p>
        </div>
      </div>
    </div>
  );
}

export default function OutputPanels({ status, topic }: OutputPanelsProps) {
  const [activeTab, setActiveTab] = useState('text');

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.15, duration: 0.4, ease: 'easeOut' },
    }),
  };

  const panels = [
    { id: 'text', component: status === 'complete' ? <TextPanel topic={topic} /> : <SkeletonCard type="text" /> },
    { id: 'animation', component: status === 'complete' ? <AnimationPanel /> : <SkeletonCard type="animation" /> },
    { id: 'avatar', component: status === 'complete' ? <AvatarPanel /> : <SkeletonCard type="avatar" /> },
  ];

  return (
    <div>
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl mb-4 lg:hidden">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="hidden lg:grid grid-cols-3 gap-4 h-[420px]">
        {panels.map((panel, i) => (
          <motion.div
            key={panel.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="h-full"
          >
            {panel.component}
          </motion.div>
        ))}
      </div>

      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {panels.map(panel =>
            panel.id === activeTab ? (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {panel.component}
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
