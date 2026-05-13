/**
 * ManimVideoPlayer
 * ────────────────
 * Premium custom HTML5 video player for Manim-generated animations.
 *
 * Features:
 *  • Seek bar with time markers (every 10s)
 *  • Fullscreen (native API + custom button)
 *  • Keyboard shortcuts  (Space=play/pause, F=fullscreen, ←/→ = ±5s, M=mute)
 *  • Volume slider
 *  • Playback speed selector
 *  • Loading / buffering state
 *  • Generation progress bar (polls status endpoint while rendering)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  RotateCcw, Gauge, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';

const VIDEO_SERVICE = 'http://localhost:8001';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type JobStatus = 'none' | 'queued' | 'rendering' | 'audio' | 'stitching' | 'ready' | 'failed';

interface StatusPayload {
  status: JobStatus;
  progress: number;
  error: string;
  error_code?: string;
}

/** Short labels for server error_code (keeps UI tidy). */
const ERROR_CODE_LABEL: Record<string, string> = {
  manim_render: 'Render',
  manim_cli: 'CLI',
  manim_missing: 'Install',
  manim_latex: 'LaTeX',
  ai_provider: 'AI',
  timeout: 'Timeout',
  output_missing: 'Output',
  network: 'Network',
};

function clipErrorForUi(text: string, max = 400): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  none: 'Not started',
  queued: 'Queued…',
  rendering: 'Rendering animation…',
  audio: 'Generating voiceover…',
  stitching: 'Stitching video…',
  ready: 'Ready',
  failed: 'Failed',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function GenerationProgress({ status, progress, error, errorCode, onRetry }: {
  status: JobStatus;
  progress: number;
  error: string;
  errorCode?: string;
  onRetry: () => void;
}) {
  if (status === 'ready') return null;

  const isFailed = status === 'failed';

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-500/20 bg-[#0f172a] shadow-xl">
      {/* Dark banner */}
      <div className="px-5 py-4 flex items-center gap-3">
        {isFailed ? (
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-red-400" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
            <Loader2 size={18} className="text-indigo-400 animate-spin" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {isFailed ? 'Video generation failed' : 'Generating Manim animation…'}
          </p>
          <p className="text-xs text-indigo-300/60 mt-0.5 max-h-28 overflow-y-auto leading-relaxed [scrollbar-width:thin]">
            {isFailed ? (
              <>
                {errorCode && ERROR_CODE_LABEL[errorCode] && (
                  <span className="text-red-300/90 font-semibold">
                    {ERROR_CODE_LABEL[errorCode]}
                    {': '}
                  </span>
                )}
                <span className="break-words text-white/80">
                  {clipErrorForUi(error || 'An unknown error occurred.')}
                </span>
              </>
            ) : (
              STATUS_LABEL[status]
            )}
          </p>
        </div>
        {isFailed && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
          >
            <RefreshCw size={12} /> Retry
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="px-5 pb-4 space-y-1.5">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/30">Powered by Manim + edge-tts</span>
            <span className="text-[10px] text-white/50 font-mono">{progress}%</span>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 pt-1">
            {(['queued', 'rendering', 'audio', 'stitching'] as JobStatus[]).map((s, i) => {
              const steps = ['queued', 'rendering', 'audio', 'stitching'];
              const currentIdx = steps.indexOf(status as string);
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isDone ? 'bg-indigo-400' : isActive ? 'bg-violet-400 animate-pulse' : 'bg-white/15'
                  }`} />
                  <span className={`text-[9px] font-medium ${
                    isDone ? 'text-indigo-300' : isActive ? 'text-violet-300' : 'text-white/20'
                  }`}>
                    {s === 'queued' ? 'Queue' : s === 'rendering' ? 'Render' : s === 'audio' ? 'Voice' : 'Stitch'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Player ───────────────────────────────────────────────────────────────

interface Props {
  chatId: string;
  question: string;
  /** Short voiceover from metadata (preferred). */
  videoScript: string;
  /** Used if the script is thin, and as context for Manim. */
  keyPoints?: string[];
  /** Full written answer — fallback only when script/key points are missing. */
  explanationFallback: string;
}

export default function ManimVideoPlayer({
  chatId,
  question,
  videoScript,
  keyPoints = [],
  explanationFallback,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const pollTimer = useRef<ReturnType<typeof setInterval>>();

  // Generation state
  const [jobStatus, setJobStatus] = useState<JobStatus>('none');
  const [jobProgress, setJobProgress] = useState(0);
  const [jobError, setJobError] = useState('');
  const [jobErrorCode, setJobErrorCode] = useState<string | undefined>(undefined);
  const [isStarted, setIsStarted] = useState(false);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Poll job status ─────────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`${VIDEO_SERVICE}/api/video/status/${chatId}`);
      if (!res.ok) return;
      const data: StatusPayload = await res.json();
      setJobStatus(data.status);
      setJobProgress(data.progress ?? 0);
      setJobError(data.error ?? '');
      setJobErrorCode(data.error_code || undefined);
      if (data.status === 'ready' || data.status === 'failed') {
        clearInterval(pollTimer.current);
      }
    } catch { /* server offline */ }
  }, [chatId]);

  // Check status on mount
  useEffect(() => {
    pollStatus();
  }, [pollStatus]);

  // Background prefetch: server may have started a job — treat as started once we see progress
  useEffect(() => {
    if (jobStatus === 'queued' || jobStatus === 'rendering' || jobStatus === 'audio' || jobStatus === 'stitching') {
      setIsStarted(true);
    }
  }, [jobStatus]);

  // Passive poll while idle so a prefetch job is picked up without clicking Generate
  useEffect(() => {
    if (isStarted || jobStatus !== 'none') return;
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      void pollStatus();
      if (ticks >= 40) window.clearInterval(id);
    }, 2500);
    return () => window.clearInterval(id);
  }, [isStarted, jobStatus, pollStatus]);

  // Start polling when generation begins
  useEffect(() => {
    if (isStarted && jobStatus !== 'ready' && jobStatus !== 'failed') {
      pollTimer.current = setInterval(pollStatus, 2000);
    }
    return () => clearInterval(pollTimer.current);
  }, [isStarted, jobStatus, pollStatus]);

  // ── Start generation ────────────────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    setIsStarted(true);
    setJobStatus('queued');
    setJobProgress(2);
    setJobError('');
    setJobErrorCode(undefined);
    try {
      await fetch(`${VIDEO_SERVICE}/api/generate-math-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          question,
          explanation_text: explanationFallback,
          video_script: videoScript,
          key_points: keyPoints,
        }),
      });
    } catch {
      setJobStatus('failed');
      setJobError('Could not reach video service. Is it running on port 8001?');
      setJobErrorCode('network');
    }
  }, [chatId, question, videoScript, keyPoints, explanationFallback]);

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (jobStatus !== 'ready') return;
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (v.paused) void v.play();
          else void v.pause();
          break;
        case 'f':
        case 'F':
          handleFullscreen();
          break;
        case 'ArrowLeft':
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case 'ArrowRight':
          v.currentTime = Math.min(v.duration, v.currentTime + 5);
          break;
        case 'm':
        case 'M':
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jobStatus, handleFullscreen]);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Controls auto-hide ──────────────────────────────────────────────────────
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (playing) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
  }, [playing]);

  // ── Video event handlers ────────────────────────────────────────────────────
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  // ── Seek bar interaction ────────────────────────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  };

  // ── Volume bar interaction ──────────────────────────────────────────────────
  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = volumeBarRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.volume = ratio;
    v.muted = ratio === 0;
    setVolume(ratio);
    setMuted(ratio === 0);
  };

  // ── Speed change ────────────────────────────────────────────────────────────
  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  };

  // ── Time markers ────────────────────────────────────────────────────────────
  const timeMarkers = duration > 0
    ? Array.from({ length: Math.floor(duration / 10) }, (_, i) => (i + 1) * 10).filter(t => t < duration)
    : [];

  // ── Not started yet ─────────────────────────────────────────────────────────
  if (!isStarted && jobStatus === 'none') {
    return (
      <div className="rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] shadow-xl">
        <div className="flex flex-col items-center justify-center py-10 px-6 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
          <div>
            <p className="text-white font-semibold text-base">Generate lesson video</p>
            <p className="text-indigo-300/60 text-xs mt-1 max-w-xs">
              About 1–2 minutes: Manim visuals plus a short spoken summary of the topic (not the full written answer). Generation takes ~1–3 minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-[10px] text-indigo-300/50">
            {['Short overview', 'Voice summary', 'Fullscreen', 'Seekable'].map(f => (
              <span key={f} className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">{f}</span>
            ))}
          </div>
          <button
            onClick={startGeneration}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Play size={16} fill="white" /> Generate Animation
          </button>
        </div>
      </div>
    );
  }

  // ── Generating / failed ─────────────────────────────────────────────────────
  if (jobStatus !== 'ready') {
    return (
      <GenerationProgress
        status={jobStatus}
        progress={jobProgress}
        error={jobError}
        errorCode={jobErrorCode}
        onRetry={startGeneration}
      />
    );
  }

  // ── Video player ─────────────────────────────────────────────────────────────
  const videoSrc = `${VIDEO_SERVICE}/api/video/${chatId}`;

  return (
    <div
      ref={containerRef}
      className={`group rounded-2xl overflow-hidden border border-indigo-500/20 bg-black shadow-2xl select-none ${
        fullscreen ? 'fixed inset-0 z-[999] rounded-none border-0' : 'relative'
      }`}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onClick={(e) => {
        // Click on the container (not controls) toggles play
        if ((e.target as HTMLElement).closest('.controls-bar')) return;
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play(); else v.pause();
      }}
      style={{ cursor: showControls || !playing ? 'default' : 'none' }}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full block bg-black"
        style={{ maxHeight: fullscreen ? '100vh' : 480 }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onEnded={() => setPlaying(false)}
        onVolumeChange={() => {
          const v = videoRef.current;
          if (v) { setMuted(v.muted); setVolume(v.muted ? 0 : v.volume); }
        }}
        preload="metadata"
        playsInline
      />

      {/* Buffering spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Center play icon flash */}
      {!playing && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm opacity-80">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div
        className={`controls-bar absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* gradient bg */}
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-3 space-y-2">

          {/* ── Seek bar ── */}
          <div
            ref={progressBarRef}
            className="relative h-4 flex items-center cursor-pointer group/bar"
            onClick={handleSeek}
          >
            {/* Track */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/20 rounded-full overflow-hidden">
              {/* Buffered */}
              <div
                className="absolute left-0 top-0 h-full bg-white/30 rounded-full"
                style={{ width: duration > 0 ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              {/* Played */}
              <div
                className="absolute left-0 top-0 h-full bg-indigo-400 rounded-full"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>

            {/* Time markers */}
            {timeMarkers.map(t => (
              <div
                key={t}
                className="absolute top-1/2 -translate-y-1/2 w-px h-2.5 bg-white/25 pointer-events-none"
                style={{ left: `${(t / duration) * 100}%` }}
              />
            ))}

            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)` }}
            />
          </div>

          {/* Time marker labels */}
          {duration > 0 && timeMarkers.length > 0 && (
            <div className="relative h-3 pointer-events-none">
              {timeMarkers.map(t => (
                <span
                  key={t}
                  className="absolute text-[8px] text-white/30 -translate-x-1/2"
                  style={{ left: `${(t / duration) * 100}%` }}
                >
                  {fmt(t)}
                </span>
              ))}
            </div>
          )}

          {/* ── Bottom controls row ── */}
          <div className="flex items-center gap-2">
            {/* Play / Pause */}
            <button
              className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) void v.play();
                else void v.pause();
              }}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              {playing
                ? <Pause size={16} className="text-white" fill="white" />
                : <Play size={16} className="text-white ml-0.5" fill="white" />
              }
            </button>

            {/* Restart */}
            <button
              className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              onClick={() => { const v = videoRef.current; if (v) { v.currentTime = 0; v.play(); } }}
              title="Restart"
            >
              <RotateCcw size={14} className="text-white/80" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
                onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }}
                title="Mute (M)"
              >
                {muted || volume === 0
                  ? <VolumeX size={15} className="text-white/80" />
                  : <Volume2 size={15} className="text-white/80" />
                }
              </button>
              {/* Volume bar */}
              <div
                ref={volumeBarRef}
                className="w-16 h-4 flex items-center cursor-pointer"
                onClick={handleVolumeClick}
              >
                <div className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-white rounded-full"
                    style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time display */}
            <span className="text-[11px] font-mono text-white/60 mx-1">
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            <div className="flex-1" />

            {/* Speed selector */}
            <div className="relative">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 transition-colors text-[11px] font-mono text-white/70"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(p => !p); }}
                title="Playback speed"
              >
                <Gauge size={12} className="text-white/50" />
                {speed}×
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl py-1 z-10">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                        speed === s
                          ? 'text-indigo-400 font-semibold bg-indigo-500/10'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              onClick={handleFullscreen}
              title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {fullscreen
                ? <Minimize2 size={15} className="text-white/80" />
                : <Maximize2 size={15} className="text-white/80" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard hint */}
      {showControls && (
        <div className="absolute top-3 left-3 flex gap-1 flex-wrap pointer-events-none">
          {[['Space', 'Play/Pause'], ['←/→', '±5s'], ['F', 'Fullscreen'], ['M', 'Mute']].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1 text-[9px] text-white/30 bg-black/30 rounded px-1.5 py-0.5">
              <kbd className="font-mono font-bold">{k}</kbd>
              <span>{l}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
