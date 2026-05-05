import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User, Sparkles, BarChart2, FileText,
  ChevronDown, ChevronUp, Maximize2, Minimize2, GraduationCap,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/moon.css';
import './reveal-deck.css';
import type { MessageItem } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function hasUsefulChartData(chartData: MessageItem['chartData']): boolean {
  if (!chartData) return false;
  if (!chartData.labels || chartData.labels.length < 2) return false;
  if (!chartData.values || chartData.values.length < 2) return false;
  if (chartData.values.every((v: number) => v === 0)) return false;
  if (new Set(chartData.values).size === 1) return false;
  return true;
}

export default function MessageBubble({ message }: { message: MessageItem }) {
  const isStreaming = !!message.streaming;

  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[75%] flex items-start gap-2">
          <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
            <User size={14} className="text-gray-600" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.content.startsWith('Error:')) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
        <div className="max-w-[85%] flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-1">
            <Sparkles size={12} className="text-red-500" />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-md px-4 py-3">
            <p className="text-sm text-red-700">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="max-w-[85%] flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
          <Sparkles size={12} className="text-emerald-600" />
        </div>
        <div className="space-y-3 flex-1 min-w-0">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
            <div className="prose prose-sm prose-gray max-w-none
              prose-headings:text-gray-800 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
              prose-h2:text-[15px] prose-h3:text-[13px]
              prose-p:text-sm prose-p:text-gray-800 prose-p:leading-relaxed prose-p:my-1.5
              prose-li:text-sm prose-li:text-gray-800 prose-li:my-0.5
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:text-xs
              prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
              prose-ul:my-1.5 prose-ol:my-1.5
              prose-table:text-xs
              prose-th:bg-gray-100 prose-th:px-2 prose-th:py-1
              prose-td:px-2 prose-td:py-1 prose-td:border-gray-200
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content + (isStreaming ? '▍' : '')}
              </ReactMarkdown>
            </div>
          </div>

          {!isStreaming && (
            <>
              {message.keyPoints && message.keyPoints.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <KeyPointsCard points={message.keyPoints} />
                </motion.div>
              )}

              {hasUsefulChartData(message.chartData) && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <ChartCard chartData={message.chartData!} />
                </motion.div>
              )}

              {message.animationScript && message.animationScript.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <RevealDeck slides={message.animationScript} />
                </motion.div>
              )}

              {message.videoScript && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <VideoScriptCard script={message.videoScript} />
                </motion.div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {message.subjectTag && (
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">{message.subjectTag}</span>
                )}
                {message.difficultyLevel && (
                  <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full capitalize">{message.difficultyLevel}</span>
                )}
                {message.cached && (
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Cached</span>
                )}
              </div>
            </>
          )}

          {isStreaming && message.keyPoints && message.keyPoints.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <KeyPointsCard points={message.keyPoints} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Key Points ──

function KeyPointsCard({ points }: { points: string[] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={12} className="text-emerald-600" />
        <span className="text-[11px] font-bold text-gray-700">Key Points</span>
      </div>
      <div className="space-y-1.5">
        {points.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-md bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-emerald-600">{i + 1}</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart ──

function ChartCard({ chartData }: { chartData: NonNullable<MessageItem['chartData']> }) {
  const data = useMemo(() => ({
    labels: chartData.labels,
    datasets: [{
      label: chartData.title || 'Data',
      data: chartData.values,
      backgroundColor: [
        'rgba(16, 185, 129, 0.7)', 'rgba(59, 130, 246, 0.7)',
        'rgba(245, 158, 11, 0.7)', 'rgba(239, 68, 68, 0.7)',
        'rgba(139, 92, 246, 0.7)', 'rgba(236, 72, 153, 0.7)',
      ],
      borderRadius: 6,
    }],
  }), [chartData]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: chartData.title || '', font: { size: 11, weight: 600 as const }, color: '#374151' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 10 } } },
      x: { ticks: { font: { size: 10 } } },
    },
  }), [chartData]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 size={12} className="text-blue-600" />
        <span className="text-[11px] font-bold text-gray-700">Chart</span>
      </div>
      <div className="h-40">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

// ── RevealJS Lecture Deck ──

function RevealDeck({ slides }: { slides: NonNullable<MessageItem['animationScript']> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<ReturnType<typeof Reveal> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!deckRef.current || revealRef.current) return;

    const deck = new Reveal(deckRef.current, {
      embedded: true,
      hash: false,
      controls: true,
      controlsTutorial: true,
      progress: true,
      slideNumber: 'c/t',
      transition: 'slide',
      transitionSpeed: 'default',
      keyboard: true,
      overview: true,
      center: false,
      width: 960,
      height: 700,
      margin: 0.06,
      minScale: 0.2,
      maxScale: 2.0,
      fragments: true,
      fragmentInURL: false,
      autoAnimateEasing: 'ease',
      autoAnimateDuration: 0.8,
    });

    deck.initialize();
    revealRef.current = deck;

    return () => {
      try { deck.destroy(); } catch { /* noop */ }
      revealRef.current = null;
    };
  }, [slides]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (revealRef.current) {
        revealRef.current.configure({ height: fs ? 900 : 700 });
        revealRef.current.layout();
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`reveal-deck-scope rounded-2xl overflow-hidden shadow-sm border border-gray-100 ${isFullscreen ? 'bg-[#111] flex flex-col' : ''}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-white/10">
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-blue-400" />
          <span className="text-[10px] font-semibold text-white/50 tracking-wider uppercase">Lecture Slides</span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen
            ? <Minimize2 size={11} className="text-white/70" />
            : <Maximize2 size={11} className="text-white/70" />
          }
        </button>
      </div>

      {/* RevealJS deck */}
      <div
        ref={deckRef}
        className="reveal"
        style={{ height: isFullscreen ? 'calc(100vh - 40px)' : 380 }}
      >
        <div className="slides">
          {slides.map((slide, i) => (
            <section key={i} data-transition="slide">
              <h2
                className="r-fit-text"
                style={{
                  fontSize: '1.3em',
                  fontWeight: 700,
                  color: '#7dd3fc',
                  textAlign: 'left',
                  marginBottom: '0.4em',
                  borderBottom: '2px solid rgba(125,211,252,0.3)',
                  paddingBottom: '0.3em',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                }}
              >
                {slide.title}
              </h2>
              <ul style={{
                textAlign: 'left',
                fontSize: '0.6em',
                lineHeight: 1.7,
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}>
                {slide.bullets.map((b, j) => (
                  <li
                    key={j}
                    className="fragment fade-up"
                    style={{
                      padding: '0.3em 0 0.3em 1.5em',
                      position: 'relative',
                      color: 'rgba(255,255,255,0.88)',
                      borderLeft: '2px solid rgba(125,211,252,0.2)',
                      marginBottom: '0.15em',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      left: '0.4em',
                      top: '0.35em',
                      color: '#7dd3fc',
                      fontWeight: 700,
                      fontSize: '0.85em',
                    }}>
                      {j + 1}.
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Video Script ──

function VideoScriptCard({ script }: { script: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-amber-600" />
          <span className="text-[11px] font-bold text-gray-700">Teacher Script</span>
        </div>
        {script.length > 200 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
            {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> Full</>}
          </button>
        )}
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        <p className="text-[11px] text-amber-800 italic leading-relaxed">
          &ldquo;{expanded ? script : script.slice(0, 200)}{!expanded && script.length > 200 ? '...' : ''}&rdquo;
        </p>
      </div>
    </div>
  );
}
