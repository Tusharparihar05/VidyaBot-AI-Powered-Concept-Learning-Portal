import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, User, BarChart2, BookmarkCheck, RefreshCw } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import SkeletonCard from './SkeletonCard';
import type { QuestionState } from '../../hooks/useQuestion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const tabs = [
  { id: 'text', label: 'Notes', icon: FileText },
  { id: 'animation', label: 'Animation', icon: Video },
  { id: 'avatar', label: 'Teacher', icon: User },
];

function TextPanel({ state }: { state: QuestionState }) {
  const chartJsData = useMemo(() => {
    if (!state.chartData) return null;
    return {
      labels: state.chartData.labels,
      datasets: [{
        label: state.chartData.title || 'Data',
        data: state.chartData.values,
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(236, 72, 153, 0.7)',
        ],
        borderRadius: 8,
      }],
    };
  }, [state.chartData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: state.chartData?.title || '',
        font: { size: 11, weight: 600 as const },
        color: '#374151',
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 10 } } },
      x: { ticks: { font: { size: 10 } } },
    },
  }), [state.chartData]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText size={14} className="text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Structured Notes</span>
        </div>
        <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full capitalize">
          {state.subjectTag || 'Generated'}
        </span>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {chartJsData && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 h-40">
            <Bar data={chartJsData} options={chartOptions} />
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-800">{state.rawQuestion}</h3>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{state.explanation}</p>
        </div>

        {state.keyPoints.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Key Points</p>
            {state.keyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                <BarChart2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-gray-700">{point}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnimationPanel({ state }: { state: QuestionState }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = state.animationScript;
  const status = state.pipelines.animation;
  const currentSlide = slides[activeSlide];

  if (status === 'processing' || status === 'pending') {
    return <SkeletonCard type="animation" />;
  }

  if (slides.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex items-center justify-center">
        <div className="text-center p-6">
          <Video size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No animation script generated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Video size={14} className="text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Explainer Animation</span>
        </div>
        <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{slides.length} Slides</span>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {state.animationUrl ? (
          <video
            src={state.animationUrl}
            controls
            className="w-full rounded-2xl bg-black"
          />
        ) : (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.15),transparent_60%)]" />
            <div className="text-center z-10 p-4">
              <p className="text-white text-xs font-semibold mb-1">Slide {activeSlide + 1}: {currentSlide?.title}</p>
              <div className="space-y-1 mt-2">
                {currentSlide?.bullets.map((b: string, i: number) => (
                  <p key={i} className="text-slate-300 text-[10px]">• {b}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {slides.map((s: { slide: number; title: string; bullets: string[] }, i: number) => (
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
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>

        {status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-[11px] text-red-600 font-medium">Animation generation failed</p>
            <button className="mt-1.5 text-[10px] bg-red-100 text-red-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 mx-auto hover:bg-red-200 transition-colors">
              <RefreshCw size={9} /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarPanel({ state }: { state: QuestionState }) {
  const status = state.pipelines.video;

  if (status === 'processing' || status === 'pending') {
    return <SkeletonCard type="avatar" />;
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <User size={14} className="text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Virtual Teacher</span>
        </div>
        <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
          {status === 'done' ? 'Ready' : status === 'failed' ? 'Failed' : 'Pending'}
        </span>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {state.videoUrl ? (
          <video
            src={state.videoUrl}
            controls
            className="w-full rounded-2xl bg-black"
          />
        ) : (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl aspect-video flex items-center justify-center relative border border-amber-100 overflow-hidden">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center mx-auto mb-2 shadow-lg">
                <User size={28} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Prof. VidyaBot</p>
              <p className="text-[10px] text-gray-500 capitalize">{state.subjectTag} Expert</p>
            </div>
          </div>
        )}

        {state.videoScript && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teacher Script</p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 max-h-32 overflow-y-auto">
              <p className="text-[10px] text-emerald-700 italic leading-relaxed">"{state.videoScript.slice(0, 300)}{state.videoScript.length > 300 ? '...' : ''}"</p>
            </div>
          </div>
        )}

        {state.keyPoints.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={11} className="text-slate-600" />
              <span className="text-[10px] font-bold text-slate-700">Key Points</span>
            </div>
            <div className="space-y-1">
              {state.keyPoints.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-[9px] text-gray-600">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-[11px] text-red-600 font-medium">Video generation failed</p>
            <button className="mt-1.5 text-[10px] bg-red-100 text-red-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 mx-auto hover:bg-red-200 transition-colors">
              <RefreshCw size={9} /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OutputPanels({ state }: { state: QuestionState }) {
  const [activeTab, setActiveTab] = useState('text');

  const isTextReady = state.pipelines.text === 'done';

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.15, duration: 0.4, ease: 'easeOut' as const },
    }),
  };

  const panels = [
    { id: 'text', component: isTextReady ? <TextPanel state={state} /> : <SkeletonCard type="text" /> },
    { id: 'animation', component: <AnimationPanel state={state} /> },
    { id: 'avatar', component: <AvatarPanel state={state} /> },
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

      <div className="hidden lg:grid grid-cols-3 gap-4 min-h-[420px]">
        {panels.map((panel, i) => (
          <motion.div
            key={panel.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
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
