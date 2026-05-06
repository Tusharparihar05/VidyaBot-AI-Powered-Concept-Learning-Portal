import { useMemo, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  User, Sparkles, BarChart2, FileText,
  ChevronDown, ChevronUp, Maximize2, Minimize2, GraduationCap, Download, Eye, EyeOff,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/moon.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
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

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** Plain-text from markdown code children (handles pre-highlight raw text and rare span trees). */
function codeBlockText(children: ReactNode): string {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(codeBlockText).join('');
  if (typeof children === 'object' && 'props' in children) {
    const p = (children as React.ReactElement<{ children?: ReactNode }>).props;
    if (p?.children !== undefined) return codeBlockText(p.children);
  }
  return '';
}

const MERMAID_START =
  /^\s*(?:graph\s+(?:LR|TD|TB|RL|BT)|flowchart\s+(?:LR|TD|TB|RL|BT)|sequenceDiagram\b|classDiagram-v2\b|classDiagram\b|stateDiagram-v2\b|stateDiagram\b|erDiagram\b|gantt\b|pie\b|journey\b|gitGraph\b|mindmap\b|timeline\b|block-beta\b|sankey-beta\b)/im;

function isMermaidFence(lang: string | undefined, raw: string): boolean {
  const l = (lang || '').toLowerCase();
  if (l === 'mermaid' || l === 'mmd' || l === 'mer' /* typo */) return true;
  if (l === 'graph' || l === 'flowchart') return true;
  if (!l || l === 'plaintext' || l === 'text') {
    return MERMAID_START.test(raw.trimStart());
  }
  return false;
}

/** Strip trailing inline `#`/`//`/`%%` comments (after whitespace, ignoring quoted labels). */
function stripTrailingComment(line: string): string {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (inQuote) continue;
    const prev = line[i - 1] || ' ';
    const next = line[i + 1] || '';
    if (ch === '#' && /\s/.test(prev) && next !== '#') return line.slice(0, i).trimEnd();
    if (ch === '/' && next === '/' && /\s/.test(prev)) return line.slice(0, i).trimEnd();
    if (ch === '%' && next === '%' && /\s/.test(prev)) return line.slice(0, i).trimEnd();
  }
  return line;
}

const STYLING_LINE = /^\s*(style|linkStyle|classDef|class)\s+/i;

/** Fixes common LLM output mistakes that Mermaid 11 rejects */
function sanitizeMermaid(src: string): string {
  return src
    .trim()
    .split('\n')
    .map((rawLine) => {
      const trimmedStart = rawLine.trimStart();
      // Drop full-line `#`/`//`/`%%` comments
      if (/^#(?!#)/.test(trimmedStart) || /^\/\//.test(trimmedStart) || /^%%/.test(trimmedStart)) {
        return '';
      }
      // Drop styling lines entirely — they reference nodes that may not exist
      // and frequently use disallowed unit syntax. Diagrams render fine without them.
      if (STYLING_LINE.test(rawLine)) return '';

      let line = stripTrailingComment(rawLine);

      // Promote ambiguous "A -- B" (no closing label) to "A --- B"
      line = line.replace(/([A-Za-z0-9_\])>}])\s+--\s+([A-Za-z0-9_(\[<{])/g, '$1 --- $2');

      return line;
    })
    .filter((line, idx, arr) => {
      if (line.trim() !== '') return true;
      if (idx === 0 || idx === arr.length - 1) return false;
      return arr[idx - 1].trim() !== '';
    })
    .join('\n');
}

let mermaidVisualTheme: 'dark' | 'neutral' | null = null;

async function prepareMermaidDiagram(src: string, isDark: boolean): Promise<string | null> {
  const mermaid = (await import('mermaid')).default;
  const visualTheme: 'dark' | 'neutral' = isDark ? 'dark' : 'neutral';

  if (mermaidVisualTheme !== visualTheme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: visualTheme,
      suppressErrorRendering: true,
      themeVariables: isDark
        ? { primaryColor: '#1e293b', primaryTextColor: '#e5e7eb', primaryBorderColor: '#818cf8', lineColor: '#94a3b8' }
        : { primaryColor: '#eef2ff', primaryTextColor: '#0f172a', primaryBorderColor: '#6366f1', lineColor: '#475569' },
    });
    mermaidVisualTheme = visualTheme;
  }

  const sanitized = sanitizeMermaid(src);
  const text = await tryParseProgressively(mermaid, sanitized);
  if (!text) return null;

  const id = `mermaid-${Math.random().toString(36).slice(2, 12)}`;
  try {
    const { svg } = await mermaid.render(id, text);
    return svg;
  } catch {
    return null;
  }
}

/** Try to parse the diagram. If it fails, progressively drop trailing lines (keeping
 *  the diagram-type header) until it parses or we run out of options. */
async function tryParseProgressively(
  mermaid: typeof import('mermaid').default,
  source: string,
): Promise<string | null> {
  const lines = source.split('\n');
  if (lines.length < 2) return null;

  try {
    await mermaid.parse(source);
    return source;
  } catch { /* fall through to truncation */ }

  // Header is line 0 (e.g. "graph LR"). Try keeping the first N body lines.
  const body = lines.slice(1);
  const stops = Array.from(new Set([
    body.length - 1,
    Math.floor(body.length * 0.75),
    Math.floor(body.length * 0.5),
    Math.floor(body.length * 0.25),
    Math.min(body.length, 6),
    Math.min(body.length, 3),
  ])).filter((n) => n >= 1).sort((a, b) => b - a);

  for (const keep of stops) {
    const candidate = [lines[0], ...body.slice(0, keep)].join('\n');
    try {
      await mermaid.parse(candidate);
      return candidate;
    } catch { /* keep shrinking */ }
  }
  return null;
}

export default function MessageBubble({ message }: { message: MessageItem }) {
  const isStreaming = !!message.streaming;
  const [showSlides, setShowSlides] = useState(false);
  const [showVideoScript, setShowVideoScript] = useState(false);

  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[75%] flex items-start gap-2">
          <div className="bg-gpai-primary text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gpai-surface-2 flex items-center justify-center shrink-0 mt-1">
            <User size={14} className="text-gray-600 dark:text-gray-300" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.content.startsWith('Error:')) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
        <div className="max-w-[85%] flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0 mt-1">
            <Sparkles size={12} className="text-red-500 dark:text-red-300" />
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl rounded-tl-md px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="max-w-[85%] flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gpai-primary-soft flex items-center justify-center shrink-0 mt-1">
          <Sparkles size={12} className="text-gpai-primary" />
        </div>
        <div className="space-y-3 flex-1 min-w-0">
          <div className="bg-gray-50 dark:bg-gpai-surface-2 border border-gray-100 dark:border-gpai-border rounded-2xl rounded-tl-md px-4 py-3">
            <div className="prose prose-sm prose-gray dark:prose-invert max-w-none
              prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
              prose-h2:text-[15px] prose-h3:text-[13px]
              prose-p:text-sm prose-p:text-gray-800 dark:prose-p:text-gray-100 prose-p:leading-relaxed prose-p:my-1.5
              prose-li:text-sm prose-li:text-gray-800 dark:prose-li:text-gray-100 prose-li:my-0.5
              prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
              prose-code:text-gpai-primary prose-code:bg-gpai-primary-soft prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 dark:prose-pre:bg-[#0d1117] prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:text-xs
              prose-a:text-gpai-primary prose-a:no-underline hover:prose-a:underline
              prose-ul:my-1.5 prose-ol:my-1.5
              prose-table:text-xs
              prose-th:bg-gray-100 dark:prose-th:bg-gpai-surface prose-th:px-2 prose-th:py-1
              prose-td:px-2 prose-td:py-1 prose-td:border-gray-200 dark:prose-td:border-gpai-border
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, [rehypeHighlight, { plainText: ['mermaid', 'mmd'] }]]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match?.[1];
                    const raw = codeBlockText(children).replace(/\n$/, '');
                    const looksBlock = raw.includes('\n') || ['mermaid', 'mmd', 'graph', 'flowchart'].includes((lang || '').toLowerCase());

                    if (isMermaidFence(lang, raw) && looksBlock) {
                      if (isStreaming) {
                        return (
                          <pre className="bg-[#0d1117] text-gray-100 rounded-lg p-3 text-xs overflow-x-auto my-2 not-prose">
                            <code>{raw}</code>
                          </pre>
                        );
                      }
                      return <MermaidDiagram chart={raw} />;
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
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

              {(message.animationScript?.length || message.videoScript) && (
                <div className="flex flex-wrap gap-2">
                  {message.animationScript && message.animationScript.length > 0 && (
                    <button
                      onClick={() => setShowSlides(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gpai-primary/30 bg-gpai-primary-soft text-gpai-primary text-xs font-medium hover:bg-gpai-primary/15 transition-colors"
                    >
                      {showSlides ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showSlides ? 'Hide Slides' : 'Show Slides'}
                    </button>
                  )}
                  {message.videoScript && (
                    <button
                      onClick={() => setShowVideoScript(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors"
                    >
                      {showVideoScript ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showVideoScript ? 'Hide Teacher Script' : 'Show Teacher Script'}
                    </button>
                  )}
                </div>
              )}

              {showSlides && message.animationScript && message.animationScript.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <RevealDeck slides={message.animationScript} />
                </motion.div>
              )}

              {showVideoScript && message.videoScript && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <VideoScriptCard script={message.videoScript} />
                </motion.div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {message.subjectTag && (
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 px-2 py-0.5 rounded-full capitalize">{message.subjectTag}</span>
                )}
                {message.difficultyLevel && (
                  <span className="text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300 px-2 py-0.5 rounded-full capitalize">{message.difficultyLevel}</span>
                )}
                {message.cached && (
                  <span className="text-[10px] font-medium bg-gpai-primary-soft text-gpai-primary px-2 py-0.5 rounded-full">Cached</span>
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
    <div className="bg-white dark:bg-gpai-surface border border-gray-100 dark:border-gpai-border rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={12} className="text-gpai-primary" />
        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">Key Points</span>
      </div>
      <div className="space-y-1.5">
        {points.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-md bg-gpai-primary-soft flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-gpai-primary">{i + 1}</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{p}</p>
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
    <div className="bg-white dark:bg-gpai-surface border border-gray-100 dark:border-gpai-border rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 size={12} className="text-blue-600 dark:text-blue-400" />
        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">Chart</span>
      </div>
      <div className="h-40">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setSvg(null);

    const run = async () => {
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const out = await prepareMermaidDiagram(chart, isDark);
      if (cancelled) return;
      if (out) {
        setSvg(out);
        setPhase('ok');
      } else {
        setPhase('fail');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (phase === 'loading') {
    return (
      <div className="my-2 rounded-lg border border-dashed border-gpai-border bg-gpai-surface-2/50 px-3 py-4 text-center text-xs text-gpai-muted not-prose">
        Rendering diagram…
      </div>
    );
  }

  if (phase === 'fail' || !svg) {
    return (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto my-2 not-prose">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      className="my-3 rounded-lg border border-gray-200 dark:border-gpai-border bg-white dark:bg-[#0d1117] p-2 overflow-x-auto not-prose"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
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

  const downloadSlides = useCallback(() => {
    const slidesHtml = slides
      .map((slide, idx) => {
        const bulletsHtml = slide.bullets
          .map(b => `<li>${escapeHtml(b)}</li>`)
          .join('');
        const codeHtml = slide.code
          ? `<pre><code class="language-${escapeHtml(slide.code.language)}">${escapeHtml(slide.code.source)}</code></pre>`
          : '';
        const diagramHtml = slide.diagram
          ? `<pre class="mermaid">${escapeHtml(slide.diagram)}</pre>`
          : '';
        const formulaHtml = slide.formula
          ? `<p>$$${slide.formula}$$</p>`
          : '';
        return `
        <section>
          <h2>${idx + 1}. ${escapeHtml(slide.title)}</h2>
          <ul>${bulletsHtml}</ul>
          ${codeHtml}
          ${diagramHtml}
          ${formulaHtml}
        </section>`;
      })
      .join('\n');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VidyaBot Slides</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/moon.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css">
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/highlight/highlight.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/math/math.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    Reveal.initialize({
      hash: true, controls: true, progress: true, slideNumber: true, transition: 'slide',
      plugins: [RevealHighlight, RevealMath.KaTeX]
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidyabot-slides-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [slides]);

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
        <div className="flex items-center gap-2">
          <button
            onClick={downloadSlides}
            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Download slides"
          >
            <Download size={11} className="text-white/70" />
          </button>
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
      </div>

      {/* RevealJS deck */}
      <div
        ref={deckRef}
        className="reveal"
        style={{ height: isFullscreen ? 'calc(100vh - 40px)' : 380 }}
      >
        <div className="slides">
          {slides.map((slide, i) => (
            <SlideSection key={i} slide={slide} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slide content components ──

type SlideShape = NonNullable<MessageItem['animationScript']>[number];

function SlideSection({ slide }: { slide: SlideShape }) {
  return (
    <section data-transition="slide">
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

      {slide.bullets.length > 0 && (
        <ul style={{
          textAlign: 'left',
          fontSize: '0.6em',
          lineHeight: 1.6,
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          {slide.bullets.map((b, j) => (
            <li
              key={j}
              className="fragment fade-up slide-bullet-md"
              style={{
                padding: '0.25em 0 0.25em 1.5em',
                position: 'relative',
                color: 'rgba(255,255,255,0.9)',
                borderLeft: '2px solid rgba(125,211,252,0.2)',
                marginBottom: '0.12em',
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {b}
              </ReactMarkdown>
            </li>
          ))}
        </ul>
      )}

      {slide.code && slide.code.source && (
        <div className="fragment fade-up" style={{ marginTop: '0.5em' }}>
          <SlideCode language={slide.code.language || 'text'} source={slide.code.source} />
        </div>
      )}

      {slide.diagram && (
        <div className="fragment fade-up" style={{ marginTop: '0.5em' }}>
          <SlideDiagram source={slide.diagram} />
        </div>
      )}

      {slide.formula && (
        <div className="fragment fade-up slide-formula">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {`$$${slide.formula}$$`}
          </ReactMarkdown>
        </div>
      )}
    </section>
  );
}

function SlideCode({ language, source }: { language: string; source: string }) {
  return (
    <div>
      <span className="slide-code-lang">{language}</span>
      <pre className="slide-code">
        <ReactMarkdown
          rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children }) => (
              <code className={className || `language-${language}`}>{children}</code>
            ),
          }}
        >
          {`\`\`\`${language}\n${source}\n\`\`\``}
        </ReactMarkdown>
      </pre>
    </div>
  );
}

function SlideDiagram({ source }: { source: string }) {
  return (
    <div className="slide-diagram-wrap">
      <MermaidDiagram chart={source} />
    </div>
  );
}

// ── Video Script ──

function VideoScriptCard({ script }: { script: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gpai-surface border border-gray-100 dark:border-gpai-border rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">Teacher Script</span>
        </div>
        {script.length > 200 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-amber-600 dark:text-amber-300 font-medium flex items-center gap-0.5">
            {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> Full</>}
          </button>
        )}
      </div>
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 rounded-xl px-3 py-2">
        <p className="text-[11px] text-amber-800 dark:text-amber-200 italic leading-relaxed">
          &ldquo;{expanded ? script : script.slice(0, 200)}{!expanded && script.length > 200 ? '...' : ''}&rdquo;
        </p>
      </div>
    </div>
  );
}
