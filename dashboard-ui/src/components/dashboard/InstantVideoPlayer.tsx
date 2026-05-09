/**
 * InstantVideoPlayer
 * ──────────────────
 * Renders a fully animated, voiced "lecture video" entirely in the browser.
 *
 * Pipeline (all client-side, < 5 seconds to start):
 *  1. Parse the videoScript into timed slides (sentence groups).
 *  2. Animate each slide on an HTML Canvas (title + bullets + math formulas).
 *  3. Narrate each slide using the Web Speech API (SpeechSynthesis).
 *  4. Move to the next slide when speech ends.
 *
 * No backend, no Manim, no MoviePy — instant.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Download, Loader2 } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseScriptIntoSlides(script: string): { title: string; body: string }[] {
  // Split on sentence-ending punctuation followed by two or more spaces, newlines, or caps
  const rawSentences = script
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s{2,}|\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);

  // Group every 2-3 sentences into a "slide"
  const slides: { title: string; body: string }[] = [];
  const GROUP_SIZE = 3;
  for (let i = 0; i < rawSentences.length; i += GROUP_SIZE) {
    const group = rawSentences.slice(i, i + GROUP_SIZE);
    // Use first sentence (up to 60 chars) as title
    const firstSentence = group[0] || '';
    const title = firstSentence.length > 60 ? firstSentence.slice(0, 57) + '…' : firstSentence;
    const body = group.join(' ');
    slides.push({ title, body });
  }

  if (slides.length === 0) {
    // Fallback: treat entire script as one slide
    const trimmed = script.trim();
    slides.push({
      title: trimmed.slice(0, 60) + (trimmed.length > 60 ? '…' : ''),
      body: trimmed,
    });
  }

  return slides;
}

// Word-wrap text to fit canvas width
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0f172a',
  accent: '#818cf8',
  accentLight: '#c7d2fe',
  text: '#e2e8f0',
  muted: '#94a3b8',
  highlight: '#fbbf24',
  card: '#1e293b',
  border: '#334155',
};

function renderSlide(
  canvas: HTMLCanvasElement,
  slide: { title: string; body: string },
  slideIndex: number,
  totalSlides: number,
  progress: number,   // 0..1 speech progress
  animFrame: number,  // incrementing animation frame counter
) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Animated particles in background
  ctx.save();
  for (let p = 0; p < 18; p++) {
    const t = animFrame * 0.01 + p * 1.7;
    const px = (Math.sin(t * 0.7 + p) * 0.5 + 0.5) * W;
    const py = (Math.cos(t * 0.5 + p * 1.3) * 0.5 + 0.5) * H;
    const r = 1.5 + Math.sin(t + p) * 1;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(129,140,248,${0.08 + Math.sin(t * 2) * 0.04})`;
    ctx.fill();
  }
  ctx.restore();

  // Card
  const cardPad = 48;
  const cardX = cardPad;
  const cardY = 70;
  const cardW = W - cardPad * 2;
  const cardH = H - 140;
  ctx.save();
  ctx.shadowColor = 'rgba(129,140,248,0.18)';
  ctx.shadowBlur = 32;
  ctx.fillStyle = COLORS.card;
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Card border
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.stroke();
  ctx.restore();

  // Accent bar at top of card
  const accentGrad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0);
  accentGrad.addColorStop(0, '#818cf8');
  accentGrad.addColorStop(1, '#c084fc');
  ctx.save();
  ctx.fillStyle = accentGrad;
  roundRectTop(ctx, cardX, cardY, cardW, 5, 20);
  ctx.fill();
  ctx.restore();

  // Slide number badge
  ctx.save();
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = COLORS.accent;
  const badge = `${slideIndex + 1} / ${totalSlides}`;
  ctx.fillText(badge, cardX + 20, cardY + 28);
  ctx.restore();

  // Title
  ctx.save();
  ctx.font = 'bold 26px Inter, sans-serif';
  ctx.fillStyle = COLORS.accentLight;
  const titleLines = wrapText(ctx, slide.title, cardW - 60);
  let titleY = cardY + 65;
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, cardX + 30, titleY);
    titleY += 36;
  }
  ctx.restore();

  // Divider
  ctx.save();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, titleY + 2);
  ctx.lineTo(cardX + cardW - 30, titleY + 2);
  ctx.stroke();
  ctx.restore();

  // Body text
  ctx.save();
  ctx.font = '15px Inter, sans-serif';
  ctx.fillStyle = COLORS.text;
  const bodyLines = wrapText(ctx, slide.body, cardW - 60);
  let bodyY = titleY + 28;
  const maxBodyLines = Math.floor((cardH - (titleY - cardY) - 80) / 24);
  for (const line of bodyLines.slice(0, maxBodyLines)) {
    ctx.fillText(line, cardX + 30, bodyY);
    bodyY += 24;
  }
  ctx.restore();

  // Progress bar at bottom of card
  const pbY = cardY + cardH - 18;
  ctx.save();
  ctx.fillStyle = COLORS.border;
  roundRect(ctx, cardX + 30, pbY, cardW - 60, 6, 3);
  ctx.fill();
  const pbW = Math.max(0, Math.min(1, progress)) * (cardW - 60);
  if (pbW > 0) {
    const pbGrad = ctx.createLinearGradient(cardX + 30, 0, cardX + 30 + pbW, 0);
    pbGrad.addColorStop(0, '#818cf8');
    pbGrad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = pbGrad;
    roundRect(ctx, cardX + 30, pbY, pbW, 6, 3);
    ctx.fill();
  }
  ctx.restore();

  // VidyaBot watermark
  ctx.save();
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillStyle = 'rgba(129,140,248,0.5)';
  ctx.fillText('✦ VidyaBot', cardX + 30, H - 18);
  ctx.restore();

  // Animated wave at the bottom (sound visualizer illusion)
  ctx.save();
  const waveY = H - 38;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 2) {
    const amp = 4 + Math.sin(animFrame * 0.06 + x * 0.04) * 2;
    const y = waveY + Math.sin(animFrame * 0.08 + x * 0.025) * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(129,140,248,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Canvas helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  script: string;
  question?: string;
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'done';

export default function InstantVideoPlayer({ script, question }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechProgressRef = useRef(0);

  const [slides] = useState(() => parseScriptIntoSlides(script));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [muted, setMuted] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);

  // Check speech synthesis availability
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Preload voices
      const loadVoices = () => {
        const v = speechSynthesis.getVoices();
        if (v.length > 0) setSpeechReady(true);
      };
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
      setSpeechReady(true);
    }
    return () => {
      stopSpeech();
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      animFrameRef.current += 1;
      const slide = slides[currentSlide] || slides[0];
      renderSlide(canvas, slide, currentSlide, slides.length, speechProgressRef.current, animFrameRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentSlide, slides]);

  function stopSpeech() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    speechProgressRef.current = 0;
    setSpeechProgress(0);
  }

  function getVoice(): SpeechSynthesisVoice | null {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    // Prefer good English voices
    const preferred = [
      'Google UK English Male',
      'Google US English',
      'Microsoft David - English (United States)',
      'Alex',
      'Daniel',
    ];
    for (const name of preferred) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }
    // Fallback: first English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  const speakSlide = useCallback((index: number, onEnd: () => void) => {
    if (!('speechSynthesis' in window)) {
      // No TTS — advance after 3 seconds
      setTimeout(onEnd, 3000);
      return;
    }

    speechSynthesis.cancel();
    speechProgressRef.current = 0;
    setSpeechProgress(0);

    const slide = slides[index];
    if (!slide) { onEnd(); return; }

    const utt = new SpeechSynthesisUtterance(slide.body);
    utt.rate = 0.92;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    const voice = getVoice();
    if (voice) utt.voice = voice;

    utt.onboundary = (e) => {
      if (e.name === 'word' && utt.text.length > 0) {
        const prog = Math.min(1, (e.charIndex + e.charLength) / utt.text.length);
        speechProgressRef.current = prog;
        setSpeechProgress(prog);
      }
    };

    utt.onend = () => {
      speechProgressRef.current = 1;
      setSpeechProgress(1);
      onEnd();
    };

    utt.onerror = () => onEnd();

    utteranceRef.current = utt;
    speechSynthesis.speak(utt);
  }, [slides]);

  const playFromSlide = useCallback((startIndex: number) => {
    if (startIndex >= slides.length) {
      setPlayerState('done');
      return;
    }
    setCurrentSlide(startIndex);
    setPlayerState('playing');
    speechProgressRef.current = 0;
    setSpeechProgress(0);

    const advance = (idx: number) => {
      if (idx >= slides.length) {
        setPlayerState('done');
        return;
      }
      setCurrentSlide(idx);
      speechProgressRef.current = 0;
      setSpeechProgress(0);
      speakSlide(idx, () => {
        advance(idx + 1);
      });
    };

    speakSlide(startIndex, () => advance(startIndex + 1));
  }, [slides, speakSlide]);

  const handlePlay = useCallback(() => {
    if (playerState === 'paused') {
      if ('speechSynthesis' in window) speechSynthesis.resume();
      setPlayerState('playing');
    } else if (playerState === 'done') {
      playFromSlide(0);
    } else {
      playFromSlide(currentSlide);
    }
  }, [playerState, currentSlide, playFromSlide]);

  const handlePause = useCallback(() => {
    if ('speechSynthesis' in window) speechSynthesis.pause();
    setPlayerState('paused');
  }, []);

  const handleNext = useCallback(() => {
    stopSpeech();
    const next = Math.min(currentSlide + 1, slides.length - 1);
    if (playerState === 'playing') {
      playFromSlide(next);
    } else {
      setCurrentSlide(next);
    }
  }, [currentSlide, slides.length, playerState, playFromSlide]);

  const handlePrev = useCallback(() => {
    stopSpeech();
    const prev = Math.max(currentSlide - 1, 0);
    if (playerState === 'playing') {
      playFromSlide(prev);
    } else {
      setCurrentSlide(prev);
    }
  }, [currentSlide, playerState, playFromSlide]);

  const handleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if ('speechSynthesis' in window) {
      if (next) {
        // "mute" = set volume to 0 by cancelling and not speaking
        speechSynthesis.cancel();
      }
    }
  }, [muted]);

  const handleDownload = useCallback(() => {
    // Capture current canvas frame as PNG
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidyabot-slide-${currentSlide + 1}.png`;
    a.click();
  }, [currentSlide]);

  const isPlaying = playerState === 'playing';
  const isDone = playerState === 'done';

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-500/30 shadow-xl bg-[#0f172a]">
      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={420}
          className="w-full block"
          style={{ aspectRatio: '800/420' }}
        />
        {/* Play overlay when idle/done */}
        {(playerState === 'idle' || isDone) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <button
              onClick={handlePlay}
              className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              <Play size={32} className="text-white ml-1" fill="white" />
            </button>
          </div>
        )}
        {/* Header badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">
            {isPlaying ? 'Live' : isDone ? 'Done' : 'Preview'}
          </span>
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-[#1e293b] border-t border-white/10 px-4 py-3 flex items-center gap-3">
        {/* Prev */}
        <button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
          title="Previous slide"
        >
          <SkipBack size={14} className="text-white" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={16} className="text-white" fill="white" />
          ) : (
            <Play size={16} className="text-white ml-0.5" fill="white" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={handleNext}
          disabled={currentSlide >= slides.length - 1}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
          title="Next slide"
        >
          <SkipForward size={14} className="text-white" />
        </button>

        {/* Slide indicator */}
        <div className="flex-1 flex items-center gap-2 mx-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentSlide + speechProgress) / slides.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-white/50 shrink-0">
            {currentSlide + 1}/{slides.length}
          </span>
        </div>

        {/* Mute */}
        <button
          onClick={handleMute}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted
            ? <VolumeX size={14} className="text-white/50" />
            : <Volume2 size={14} className="text-white" />
          }
        </button>

        {/* Download frame */}
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          title="Save current frame"
        >
          <Download size={14} className="text-white" />
        </button>
      </div>

      {/* Slide dots */}
      <div className="bg-[#0f172a] px-4 pb-3 flex items-center justify-center gap-1.5 flex-wrap">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              stopSpeech();
              setCurrentSlide(i);
              if (playerState === 'playing') playFromSlide(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === currentSlide
                ? 'w-5 bg-indigo-400'
                : 'w-1.5 bg-white/20 hover:bg-white/40'
            }`}
            title={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Info bar */}
      {!speechReady && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-2 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin text-amber-400" />
          <span className="text-[11px] text-amber-300">Loading voices…</span>
        </div>
      )}
      {question && (
        <div className="bg-indigo-950/50 border-t border-indigo-500/10 px-4 py-2">
          <p className="text-[11px] text-indigo-300/70 truncate">📚 {question}</p>
        </div>
      )}
    </div>
  );
}
