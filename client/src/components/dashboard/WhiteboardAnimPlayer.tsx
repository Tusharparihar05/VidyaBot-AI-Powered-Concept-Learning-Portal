import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import type { MessageItem } from '../../services/api';
import { handBase64 } from './handImage';
import { processHandImageAdvanced } from './handImageProcessor';

type WBScript = NonNullable<MessageItem['whiteboardScript']>;
type Scene = WBScript['scenes'][number];
type Element = Scene['elements'][number];

const POSITIONS: Record<string, [number, number]> = {
  top_left:      [0.12, 0.15],
  top_center:    [0.50, 0.12],
  top_right:     [0.82, 0.15],
  center_left:   [0.15, 0.50],
  center:        [0.50, 0.50],
  center_right:  [0.82, 0.50],
  bottom_left:   [0.15, 0.82],
  bottom_center: [0.50, 0.85],
  bottom_right:  [0.82, 0.85],
};

function getPos(pos: string, w: number, h: number): [number, number] {
  const [rx, ry] = POSITIONS[pos] || [0.5, 0.5];
  return [Math.round(rx * w), Math.round(ry * h)];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawPresentation(
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number
) {
  mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
  mainCtx.drawImage(bgCanvas, 0, 0);
  if (handImg && x >= 0 && y >= 0) {
    // Offset the hand so the tip of the marker aligns with x, y
    // The image has its background removed via handImageProcessor
    const ratio = handImg.height / handImg.width;
    mainCtx.drawImage(handImg, x - 15, y - 25, 250, 250 * ratio);
  }
}

async function animateText(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  text: string, x: number, y: number, color: string, fontSize: number,
  onFrame: () => void, cancelled: () => boolean
) {
  bgCtx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
  bgCtx.fillStyle = color;
  bgCtx.textAlign = 'left';
  bgCtx.textBaseline = 'alphabetic';
  
  let currentX = x;
  for (let i = 0; i < text.length; i++) {
    if (cancelled()) return;
    const char = text[i];
    bgCtx.fillText(char, currentX, y);
    const charWidth = bgCtx.measureText(char).width;
    currentX += charWidth;
    
    drawPresentation(mainCtx, bgCanvas, handImg, currentX, y - fontSize / 2);
    onFrame();
    // Slowed down from 28ms to 45ms for better voiceover sync
    await sleep(45);
  }
}

async function animateBox(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  x: number, y: number, w: number, h: number,
  color: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const steps = 40;
  const perim = 2 * (w + h);
  let lastX = x, lastY = y;
  
  bgCtx.strokeStyle = color; bgCtx.lineWidth = 2.5; bgCtx.setLineDash([]);
  
  for (let i = 1; i <= steps; i++) {
    if (cancelled()) return;
    const progress = i / steps;
    const dist = progress * perim;
    
    let currX = x, currY = y;
    if (dist <= w) {
      currX = x + dist; currY = y;
    } else if (dist <= w + h) {
      currX = x + w; currY = y + (dist - w);
    } else if (dist <= 2 * w + h) {
      currX = x + w - (dist - w - h); currY = y + h;
    } else {
      currX = x; currY = y + h - (dist - 2 * w - h);
    }
    
    bgCtx.beginPath(); bgCtx.moveTo(lastX, lastY); bgCtx.lineTo(currX, currY); bgCtx.stroke();
    lastX = currX; lastY = currY;
    
    drawPresentation(mainCtx, bgCanvas, handImg, currX, currY);
    onFrame();
    // Slowed down from 18ms to 30ms
    await sleep(30);
  }
}

async function animateArrow(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  x1: number, y1: number, x2: number, y2: number,
  color: string, label: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const steps = 30;
  let lastX = x1, lastY = y1;
  bgCtx.strokeStyle = color; bgCtx.lineWidth = 2.5;
  
  for (let i = 1; i <= steps; i++) {
    if (cancelled()) return;
    const t = i / steps;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    
    bgCtx.beginPath(); bgCtx.moveTo(lastX, lastY); bgCtx.lineTo(cx, cy); bgCtx.stroke();
    lastX = cx; lastY = cy;
    
    drawPresentation(mainCtx, bgCanvas, handImg, cx, cy);
    onFrame();
    // Slowed down from 20ms to 35ms
    await sleep(35);
  }
  
  const angle = Math.atan2(y2 - y1, x2 - x1);
  bgCtx.fillStyle = color;
  bgCtx.beginPath();
  bgCtx.moveTo(x2, y2);
  bgCtx.lineTo(x2 - 12 * Math.cos(angle - 0.4), y2 - 12 * Math.sin(angle - 0.4));
  bgCtx.lineTo(x2 - 12 * Math.cos(angle + 0.4), y2 - 12 * Math.sin(angle + 0.4));
  bgCtx.closePath(); bgCtx.fill();
  
  if (label) {
    const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2 - 12;
    bgCtx.font = 'bold 14px "Segoe UI", Arial'; bgCtx.fillStyle = color;
    bgCtx.textAlign = 'center';
    bgCtx.fillText(label, mx, my);
  }
  drawPresentation(mainCtx, bgCanvas, handImg, x2, y2);
  onFrame();
}

async function animateCircle(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  cx: number, cy: number, r: number,
  color: string, label: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const steps = 36;
  let lastAngle = -Math.PI / 2;
  bgCtx.strokeStyle = color; bgCtx.lineWidth = 2.5;
  
  for (let i = 1; i <= steps; i++) {
    if (cancelled()) return;
    const endAngle = -Math.PI / 2 + (i / steps) * 2 * Math.PI;
    
    bgCtx.beginPath(); bgCtx.arc(cx, cy, r, lastAngle, endAngle); bgCtx.stroke();
    lastAngle = endAngle;
    
    const hx = cx + r * Math.cos(endAngle);
    const hy = cy + r * Math.sin(endAngle);
    drawPresentation(mainCtx, bgCanvas, handImg, hx, hy);
    onFrame();
    // Slowed down from 18ms to 32ms
    await sleep(32);
  }
  
  if (label) {
    bgCtx.font = 'bold 15px "Segoe UI", Arial'; bgCtx.fillStyle = color;
    bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(label, cx, cy);
  }
  drawPresentation(mainCtx, bgCanvas, handImg, cx, cy);
  onFrame();
}

async function animateFlowchart(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  x: number, y: number, content: string, color: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const nodes = content.split(/→|->/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  const bw = 130; const bh = 44; const gap = 50;
  const startX = x - ((nodes.length - 1) * (bw + gap)) / 2;

  for (let i = 0; i < nodes.length; i++) {
    if (cancelled()) return;
    const nx = startX + i * (bw + gap);
    const ny = y - bh / 2;
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, nx, ny, bw, bh, color, onFrame, cancelled);
    
    const [r, g, b] = hexToRgb(color);
    bgCtx.fillStyle = `rgba(${r},${g},${b},0.08)`;
    bgCtx.fillRect(nx, ny, bw, bh);
    
    bgCtx.font = 'bold 13px "Segoe UI", Arial';
    bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(nodes[i].slice(0, 16), nx + bw / 2, ny + bh / 2);
    drawPresentation(mainCtx, bgCanvas, handImg, nx + bw / 2, ny + bh / 2);
    onFrame();
    
    if (i < nodes.length - 1) {
      await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, nx + bw, ny + bh / 2, nx + bw + gap, ny + bh / 2, color, '', onFrame, cancelled);
    }
  }
}

async function animateFormulaBox(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  x: number, y: number, content: string, color: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const w = Math.min(content.length * 13 + 60, 500);
  const h = 56;
  const bx = x - w / 2; const by = y - h / 2;
  
  bgCtx.fillStyle = 'rgba(254,243,199,0.85)';
  bgCtx.fillRect(bx, by, w, h);
  
  await animateBox(bgCtx, mainCtx, bgCanvas, handImg, bx, by, w, h, '#b45309', onFrame, cancelled);
  
  bgCtx.font = `bold 20px "Courier New", monospace`;
  bgCtx.fillStyle = '#1f2937'; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
  bgCtx.fillText(content.slice(0, 40), x, y);
  
  bgCtx.font = 'bold 11px "Segoe UI", Arial'; bgCtx.fillStyle = '#b45309';
  bgCtx.fillText('FORMULA', bx + 36, by - 10);
  
  drawPresentation(mainCtx, bgCanvas, handImg, x, y);
  onFrame();
}

async function animateGraphAxes(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  x: number, y: number, color: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const size = 140;
  await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, x - size / 2, y, x + size / 2, y, color, 'x', onFrame, cancelled);
  if (cancelled()) return;
  
  await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, x, y + size / 2, x, y - size / 2, color, 'y', onFrame, cancelled);
  if (cancelled()) return;
  
  bgCtx.strokeStyle = '#dc2626'; bgCtx.lineWidth = 2.5;
  const steps2 = 40;
  let lastX = x - size / 2;
  let lastY = y - ((-size / 2) * (-size / 2)) / (size / 2);
  
  for (let i = 1; i <= steps2; i++) {
    if (cancelled()) return;
    const t = (i / steps2 - 0.5) * size;
    const px = x + t;
    const py = y - (t * t) / (size / 2);
    
    bgCtx.beginPath(); bgCtx.moveTo(lastX, lastY); bgCtx.lineTo(px, py); bgCtx.stroke();
    lastX = px; lastY = py;
    
    drawPresentation(mainCtx, bgCanvas, handImg, px, py);
    onFrame();
    // Slowed down from 20ms to 35ms
    await sleep(35);
  }
}

async function animateBulletPoints(
  bgCtx: CanvasRenderingContext2D, mainCtx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, handImg: HTMLImageElement | null,
  x: number, y: number, bullets: string[], color: string,
  onFrame: () => void, cancelled: () => boolean
) {
  const lineHeight = 32;
  
  for (let i = 0; i < bullets.length; i++) {
    if (cancelled()) return;
    
    const bulletY = y + i * lineHeight;
    const bulletText = bullets[i].trim();
    
    // Draw bullet point with animation
    const bulletX = x - 20;
    bgCtx.fillStyle = color;
    bgCtx.font = 'bold 16px "Segoe UI", Arial';
    bgCtx.textAlign = 'left';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillText('●', bulletX, bulletY);
    
    drawPresentation(mainCtx, bgCanvas, handImg, bulletX, bulletY);
    onFrame();
    await sleep(150);
    
    // Animate bullet text
    await animateText(bgCtx, mainCtx, bgCanvas, handImg, bulletText, x, bulletY, color, 14, onFrame, cancelled);
    
    if (!cancelled()) {
      await sleep(200);
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

interface Props {
  script: WBScript;
}

export default function WhiteboardAnimPlayer({ script }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelRef = useRef(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const handImgRef = useRef<HTMLImageElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);

  // Initialize offscreen canvas and load image
  useEffect(() => {
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
      bgCanvasRef.current.width = 720;
      bgCanvasRef.current.height = 400;
    }
    
    // Load and process hand image to make background transparent
    const img = new Image();
    
    // First try to use processed image for transparency
    processHandImageAdvanced(handBase64)
      .then(processedImage => {
        img.src = processedImage;
        img.onload = () => {
          handImgRef.current = img;
        };
        img.onerror = () => {
          // Fallback to original if processing fails
          img.src = handBase64;
          img.onload = () => {
            handImgRef.current = img;
          };
        };
      })
      .catch(() => {
        // Fallback to original image
        img.src = handBase64;
        img.onload = () => {
          handImgRef.current = img;
        };
      });
  }, []);

  const clearCanvas = useCallback(() => {
    const mainCtx = canvasRef.current?.getContext('2d');
    const bgCanvas = bgCanvasRef.current;
    if (!mainCtx || !bgCanvas) return;
    
    const bgCtx = bgCanvas.getContext('2d')!;
    const W = bgCanvas.width;
    const H = bgCanvas.height;

    bgCtx.fillStyle = '#fafafa';
    bgCtx.fillRect(0, 0, W, H);
    bgCtx.strokeStyle = 'rgba(0,0,0,0.04)';
    bgCtx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) {
      bgCtx.beginPath(); bgCtx.moveTo(gx, 0); bgCtx.lineTo(gx, H); bgCtx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      bgCtx.beginPath(); bgCtx.moveTo(0, gy); bgCtx.lineTo(W, gy); bgCtx.stroke();
    }
    
    drawPresentation(mainCtx, bgCanvas, null, -1, -1);
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (muted || !window.speechSynthesis) {
        resolve();
        return;
      }
      
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      
      // Synchronized speech rate with animation delays
      // Animations are slowed by 50-100%, so speech must be proportionally slower
      utt.rate = 0.75;  // 25% slower than normal for better synchronization
      utt.pitch = 1.05;
      utt.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('en-IN'))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utt.voice = preferred;
      
      // Resolve when speech finishes
      utt.onend = () => {
        resolve();
      };
      
      utt.onerror = (event) => {
        console.warn('Speech synthesis error:', event.error);
        resolve(); // Resolve even on error to continue animation
      };
      
      utterRef.current = utt;
      window.speechSynthesis.speak(utt);
    });
  }, [muted]);

  const drawScene = useCallback(async (scene: Scene) => {
    const mainCtx = canvasRef.current?.getContext('2d');
    const bgCanvas = bgCanvasRef.current;
    if (!mainCtx || !bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d')!;
    const W = bgCanvas.width; const H = bgCanvas.height;

    cancelRef.current = false;
    clearCanvas();

    bgCtx.fillStyle = '#4f46e5';
    bgCtx.beginPath(); bgCtx.arc(28, 28, 18, 0, Math.PI * 2); bgCtx.fill();
    bgCtx.font = 'bold 14px "Segoe UI", Arial'; bgCtx.fillStyle = '#fff';
    bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(`${scene.scene_number}`, 28, 28);
    drawPresentation(mainCtx, bgCanvas, null, -1, -1);

    const onFrame = () => {};
    const cancelled = () => cancelRef.current;

    // Start voiceover and await completion for proper sync
    const speechPromise = speak(scene.narration);
    
    // Calculate element timing based on number of elements
    const elementDuration = Math.max(
      scene.duration * 1000 / Math.max(scene.elements.length, 1) * 0.8,
      600
    );

    for (const el of scene.elements) {
      if (cancelled()) break;
      const [ex, ey] = getPos(el.position, W, H);
      const hImg = handImgRef.current;

      switch (el.type) {
        case 'text':
          await animateText(bgCtx, mainCtx, bgCanvas, hImg, el.content, ex - Math.min(el.content.length * 7, 280) / 2, ey, el.color, 22, onFrame, cancelled);
          break;
        case 'box': {
          const bw = Math.min(el.content.length * 11 + 40, 420); const bh = 50;
          await animateBox(bgCtx, mainCtx, bgCanvas, hImg, ex - bw / 2, ey - bh / 2, bw, bh, el.color, onFrame, cancelled);
          if (!cancelled()) {
            bgCtx.font = 'bold 18px "Segoe UI", Arial'; bgCtx.fillStyle = el.color;
            bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
            bgCtx.fillText(el.content.slice(0, 36), ex, ey);
            drawPresentation(mainCtx, bgCanvas, hImg, ex, ey);
          }
          break;
        }
        case 'arrow': {
          const parts = el.content.split('→');
          const label = parts.length > 1 ? parts[1].trim() : el.content;
          await animateArrow(bgCtx, mainCtx, bgCanvas, hImg, ex - 80, ey, ex + 80, ey, el.color, label, onFrame, cancelled);
          break;
        }
        case 'circle':
          await animateCircle(bgCtx, mainCtx, bgCanvas, hImg, ex, ey, 45, el.color, el.content.slice(0, 12), onFrame, cancelled);
          break;
        case 'icon':
          if (!cancelled()) {
            bgCtx.font = '48px serif'; 
            bgCtx.textAlign = 'center'; 
            bgCtx.textBaseline = 'middle';
            const icon = el.content.split(' ')[0] || '💡';
            bgCtx.fillText(icon, ex, ey - 18);
            
            bgCtx.font = 'bold 14px "Segoe UI", Arial'; 
            bgCtx.fillStyle = el.color;
            bgCtx.fillText(el.content.slice(0, 36), ex, ey + 28);
            drawPresentation(mainCtx, bgCanvas, hImg, ex, ey);
            
            // Add animation for icon
            await sleep(300);
          }
          break;
        case 'underline':
          if (!cancelled()) {
            bgCtx.font = 'bold 20px "Segoe UI", Arial'; bgCtx.fillStyle = el.color;
            bgCtx.textAlign = 'center';
            bgCtx.fillText(el.content, ex, ey);
            const tw = bgCtx.measureText(el.content).width;
            await animateArrow(bgCtx, mainCtx, bgCanvas, hImg, ex - tw / 2, ey + 6, ex + tw / 2, ey + 6, el.color, '', onFrame, cancelled);
          }
          break;
        case 'flowchart':
          await animateFlowchart(bgCtx, mainCtx, bgCanvas, hImg, ex, ey, el.content, el.color, onFrame, cancelled);
          break;
        case 'formula_box':
          await animateFormulaBox(bgCtx, mainCtx, bgCanvas, hImg, ex, ey, el.content, el.color, onFrame, cancelled);
          break;
        case 'graph_axes':
          await animateGraphAxes(bgCtx, mainCtx, bgCanvas, hImg, ex, ey, el.color, onFrame, cancelled);
          break;
        case 'bullets': {
          // Support for bullet point lists
          const bullets = el.content.split('\n').filter(b => b.trim());
          await animateBulletPoints(bgCtx, mainCtx, bgCanvas, hImg, ex - 180, ey - 40, bullets, el.color, onFrame, cancelled);
          break;
        }
      }
      // Remove hand after drawing element
      drawPresentation(mainCtx, bgCanvas, null, -1, -1);
      
      // Stagger elements to stay visible during narration
      await sleep(300);
    }

    // Ensure voiceover completes before moving to next scene
    await speechPromise;
  }, [clearCanvas, speak]);

  const runScene = useCallback(async (idx: number) => {
    if (idx >= script.scenes.length) {
      setPlaying(false); setDone(true); return;
    }
    setCurrentScene(idx);
    const scene = script.scenes[idx];
    await drawScene(scene);
    if (!cancelRef.current) {
      await sleep(scene.duration * 1000);
      if (!cancelRef.current) runScene(idx + 1);
    }
  }, [script.scenes, drawScene]);

  const start = useCallback(() => {
    setDone(false); setPlaying(true);
    clearCanvas();
    runScene(0);
  }, [clearCanvas, runScene]);

  const pause = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  const nextScene = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    const next = Math.min(currentScene + 1, script.scenes.length - 1);
    cancelRef.current = false;
    setPlaying(true);
    setDone(false);
    runScene(next);
  }, [currentScene, script.scenes.length, runScene]);

  const restart = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    setTimeout(start, 100);
  }, [start]);

  useEffect(() => {
    clearCanvas();
    return () => { cancelRef.current = true; window.speechSynthesis?.cancel(); };
  }, [clearCanvas]);

  const totalScenes = script.scenes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-amber-200 shadow-xl bg-white"
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">✏️</span>
          <span className="text-xs font-bold text-amber-800 tracking-wide uppercase">Whiteboard</span>
          <span className="text-xs text-amber-600 font-medium ml-1">{script.title}</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === currentScene && playing ? 'w-5 bg-amber-500' : i < currentScene ? 'w-2 bg-amber-400' : 'w-2 bg-amber-200'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative bg-[#fafafa]">
        <canvas
          ref={canvasRef}
          width={720}
          height={400}
          className="w-full block"
          style={{ maxHeight: 400, background: '#fafafa' }}
        />
        {!playing && !done && currentScene === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto shadow-lg border-2 border-amber-200">
                <span className="text-4xl">✏️</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{script.title}</p>
              <p className="text-sm text-gray-500">{totalScenes} scenes · Hand-drawn animation</p>
              <button
                onClick={start}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:scale-105 active:scale-95 mx-auto"
              >
                <Play size={16} fill="white" /> Start Animation
              </button>
            </div>
          </div>
        )}
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="text-base font-bold text-gray-800">Animation Complete!</p>
              <button onClick={restart} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-5 py-2 rounded-xl text-sm font-semibold mx-auto transition-all">
                <RefreshCw size={14} /> Watch Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100">
        {playing ? (
          <button onClick={pause} className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white transition-colors">
            <Pause size={14} />
          </button>
        ) : (
          <button onClick={playing ? pause : start} className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white transition-colors">
            <Play size={14} fill="white" />
          </button>
        )}
        <button onClick={nextScene} disabled={currentScene >= totalScenes - 1} className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-40 flex items-center justify-center text-amber-700 transition-colors">
          <SkipForward size={14} />
        </button>
        <button onClick={restart} className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-700 transition-colors">
          <RefreshCw size={13} />
        </button>
        <button
          onClick={() => { setMuted(p => !p); if (!muted) window.speechSynthesis?.cancel(); }}
          className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-700 transition-colors"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <span className="text-[11px] text-amber-700 font-medium ml-1">
          Scene {currentScene + 1} / {totalScenes}
        </span>
        {playing && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Drawing…
          </span>
        )}
      </div>
    </motion.div>
  );
}
