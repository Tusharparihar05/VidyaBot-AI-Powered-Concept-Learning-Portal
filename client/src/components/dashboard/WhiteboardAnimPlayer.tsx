import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipForward, Volume2, VolumeX, RefreshCw, Maximize2, Minimize2, Gauge,
} from 'lucide-react';
import type { MessageItem } from '../../services/api';
import { narrationForSpeech, whiteboardElementText, FLOW_STEP_SPLIT } from '../../utils/whiteboardPlainLanguage';
import { handBase64 } from './handImage';
import { processHandImageAdvanced } from './handImageProcessor';

type WBScript = NonNullable<MessageItem['whiteboardScript']>;
type Scene = WBScript['scenes'][number];

const LOGICAL_W = 720;
const LOGICAL_H = 400;
const MARGIN_X = 36;

type HAlign = 'left' | 'center' | 'right';

const POSITIONS: Record<string, [number, number]> = {
  top_left: [0.12, 0.15],
  top_center: [0.5, 0.12],
  top_right: [0.88, 0.15],
  center_left: [0.14, 0.5],
  center: [0.5, 0.5],
  center_right: [0.86, 0.5],
  bottom_left: [0.14, 0.84],
  bottom_center: [0.5, 0.86],
  bottom_right: [0.86, 0.84],
};

function hAlignForPosition(pos: string): HAlign {
  if (pos.includes('left')) return 'left';
  if (pos.includes('right')) return 'right';
  return 'center';
}

function maxTextWidth(pos: string): number {
  const h = hAlignForPosition(pos);
  if (h === 'center') return LOGICAL_W - MARGIN_X * 2;
  return LOGICAL_W - MARGIN_X - 48;
}

function getPos(pos: string): [number, number] {
  return POSITIONS[pos] || [0.5, 0.5];
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function lineStartXForBlock(align: HAlign, ex: number, lineWidth: number, maxWidth: number): number {
  const inset = 12;
  if (align === 'left') return Math.max(MARGIN_X, ex - maxWidth / 2 + inset);
  if (align === 'right') return Math.min(LOGICAL_W - MARGIN_X - lineWidth, ex + maxWidth / 2 - inset - lineWidth);
  return ex - lineWidth / 2;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function applyCanvasTransform(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.scale(cssW / LOGICAL_W, cssH / LOGICAL_H);
}

function drawPresentation(
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number,
  y: number,
  cssW: number,
  cssH: number,
) {
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  const scaleX = (cssW / LOGICAL_W) * dpr;
  const scaleY = (cssH / LOGICAL_H) * dpr;
  const c = mainCtx.canvas;
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  mainCtx.clearRect(0, 0, c.width, c.height);
  mainCtx.drawImage(bgCanvas, 0, 0);
  if (handImg && x >= 0 && y >= 0) {
    mainCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    const ratio = handImg.height / handImg.width;
    mainCtx.drawImage(handImg, x - 15, y - 25, 250, 250 * ratio);
  }
}

async function animateText(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  text: string,
  anchorX: number,
  anchorY: number,
  color: string,
  fontSize: number,
  align: HAlign,
  maxWidth: number,
  cssW: number,
  cssH: number,
  charDelayMs: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  bgCtx.font = `bold ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
  bgCtx.fillStyle = color;
  bgCtx.textBaseline = 'middle';

  const lines = wrapLines(bgCtx, text, maxWidth);
  const lineHeight = fontSize * 1.35;
  const blockH = lines.length * lineHeight;
  let startY = anchorY - blockH / 2 + lineHeight / 2;

  for (const ln of lines) {
    if (cancelled()) return;
    const lw = bgCtx.measureText(ln).width;
    let cx = lineStartXForBlock(align, anchorX, lw, maxWidth);
    for (let i = 0; i < ln.length; i++) {
      if (cancelled()) return;
      const ch = ln[i];
      bgCtx.textAlign = 'left';
      bgCtx.fillText(ch, cx, startY);
      const cw = bgCtx.measureText(ch).width;
      cx += cw;
      drawPresentation(mainCtx, bgCanvas, handImg, cx, startY, cssW, cssH);
      onFrame();
      await sleep(charDelayMs);
    }
    startY += lineHeight;
  }
}

async function animateBox(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const steps = 40;
  const perim = 2 * (w + h);
  let lastX = x;
  let lastY = y;

  bgCtx.strokeStyle = color;
  bgCtx.lineWidth = 2.5;
  bgCtx.setLineDash([]);

  for (let i = 1; i <= steps; i++) {
    if (cancelled()) return;
    const progress = i / steps;
    const dist = progress * perim;

    let currX = x;
    let currY = y;
    if (dist <= w) {
      currX = x + dist;
      currY = y;
    } else if (dist <= w + h) {
      currX = x + w;
      currY = y + (dist - w);
    } else if (dist <= 2 * w + h) {
      currX = x + w - (dist - w - h);
      currY = y + h;
    } else {
      currX = x;
      currY = y + h - (dist - 2 * w - h);
    }

    bgCtx.beginPath();
    bgCtx.moveTo(lastX, lastY);
    bgCtx.lineTo(currX, currY);
    bgCtx.stroke();
    lastX = currX;
    lastY = currY;

    drawPresentation(mainCtx, bgCanvas, handImg, currX, currY, cssW, cssH);
    onFrame();
    await sleep(28);
  }
}

async function animateArrow(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  label: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const steps = 30;
  let lastX = x1;
  let lastY = y1;
  bgCtx.strokeStyle = color;
  bgCtx.lineWidth = 2.5;

  for (let i = 1; i <= steps; i++) {
    if (cancelled()) return;
    const t = i / steps;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;

    bgCtx.beginPath();
    bgCtx.moveTo(lastX, lastY);
    bgCtx.lineTo(cx, cy);
    bgCtx.stroke();
    lastX = cx;
    lastY = cy;

    drawPresentation(mainCtx, bgCanvas, handImg, cx, cy, cssW, cssH);
    onFrame();
    await sleep(32);
  }

  const angle = Math.atan2(y2 - y1, x2 - x1);
  bgCtx.fillStyle = color;
  bgCtx.beginPath();
  bgCtx.moveTo(x2, y2);
  bgCtx.lineTo(x2 - 12 * Math.cos(angle - 0.4), y2 - 12 * Math.sin(angle - 0.4));
  bgCtx.lineTo(x2 - 12 * Math.cos(angle + 0.4), y2 - 12 * Math.sin(angle + 0.4));
  bgCtx.closePath();
  bgCtx.fill();

  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 14;
    bgCtx.font = 'bold 14px Inter, "Segoe UI", system-ui, sans-serif';
    bgCtx.fillStyle = color;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillText(label, mx, my);
  }
  drawPresentation(mainCtx, bgCanvas, handImg, x2, y2, cssW, cssH);
  onFrame();
}

async function animateCircle(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  color: string,
  label: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const steps = 36;
  let lastAngle = -Math.PI / 2;
  bgCtx.strokeStyle = color;
  bgCtx.lineWidth = 2.5;

  for (let i = 1; i <= steps; i++) {
    if (cancelled()) return;
    const endAngle = -Math.PI / 2 + (i / steps) * 2 * Math.PI;

    bgCtx.beginPath();
    bgCtx.arc(cx, cy, r, lastAngle, endAngle);
    bgCtx.stroke();
    lastAngle = endAngle;

    const hx = cx + r * Math.cos(endAngle);
    const hy = cy + r * Math.sin(endAngle);
    drawPresentation(mainCtx, bgCanvas, handImg, hx, hy, cssW, cssH);
    onFrame();
    await sleep(28);
  }

  if (label) {
    bgCtx.font = 'bold 15px Inter, "Segoe UI", system-ui, sans-serif';
    bgCtx.fillStyle = color;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillText(label, cx, cy);
  }
  drawPresentation(mainCtx, bgCanvas, handImg, cx, cy, cssW, cssH);
  onFrame();
}

async function animateFlowchart(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number,
  y: number,
  content: string,
  color: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const nodes = content.split(FLOW_STEP_SPLIT).map(s => s.trim()).filter(Boolean).slice(0, 5);
  const bw = 120;
  const bh = 40;
  const gap = 44;
  const startX = x - ((nodes.length - 1) * (bw + gap)) / 2;

  for (let i = 0; i < nodes.length; i++) {
    if (cancelled()) return;
    const nx = startX + i * (bw + gap);
    const ny = y - bh / 2;
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, nx, ny, bw, bh, color, cssW, cssH, onFrame, cancelled);

    const [r, g, b] = hexToRgb(color);
    bgCtx.fillStyle = `rgba(${r},${g},${b},0.08)`;
    bgCtx.fillRect(nx, ny, bw, bh);

    bgCtx.font = 'bold 12px Inter, "Segoe UI", system-ui, sans-serif';
    bgCtx.fillStyle = color;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    const label = nodes[i].length > 18 ? `${nodes[i].slice(0, 17)}…` : nodes[i];
    bgCtx.fillText(label, nx + bw / 2, ny + bh / 2);
    drawPresentation(mainCtx, bgCanvas, handImg, nx + bw / 2, ny + bh / 2, cssW, cssH);
    onFrame();

    if (i < nodes.length - 1) {
      await animateArrow(
        bgCtx,
        mainCtx,
        bgCanvas,
        handImg,
        nx + bw,
        ny + bh / 2,
        nx + bw + gap,
        ny + bh / 2,
        color,
        '',
        cssW,
        cssH,
        onFrame,
        cancelled,
      );
    }
  }
}

async function animateFormulaBox(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number,
  y: number,
  content: string,
  color: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  bgCtx.font = `bold 18px "JetBrains Mono", "Consolas", monospace`;
  const lines = wrapLines(bgCtx, content, 420);
  const lineH = 22;
  const w = Math.min(Math.max(...lines.map(l => bgCtx.measureText(l).width), 80) + 48, 480);
  const h = lines.length * lineH + 36;
  const bx = x - w / 2;
  const by = y - h / 2;

  bgCtx.fillStyle = 'rgba(254,243,199,0.92)';
  bgCtx.fillRect(bx, by, w, h);

  await animateBox(bgCtx, mainCtx, bgCanvas, handImg, bx, by, w, h, '#b45309', cssW, cssH, onFrame, cancelled);

  bgCtx.fillStyle = '#1f2937';
  bgCtx.textAlign = 'center';
  bgCtx.textBaseline = 'middle';
  let ly = by + 26;
  for (const ln of lines) {
    bgCtx.fillText(ln, x, ly);
    ly += lineH;
  }

  bgCtx.font = 'bold 10px Inter, "Segoe UI", sans-serif';
  bgCtx.fillStyle = '#b45309';
  bgCtx.textAlign = 'left';
  bgCtx.fillText('FORMULA', bx + 10, by - 8);

  drawPresentation(mainCtx, bgCanvas, handImg, x, y, cssW, cssH);
  onFrame();
}

async function animateBarChart(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  ex: number,
  ey: number,
  data: NonNullable<MessageItem['chartData']>,
  accentColor: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const labels = data.labels;
  const values = data.values;
  const n = Math.min(labels.length, values.length);
  if (n < 2) return;

  const maxV = Math.max(...values.slice(0, n), 1);
  const title = (data.title || 'Comparison').trim();
  const chartW = Math.min(280, LOGICAL_W - MARGIN_X * 2);
  const chartH = 110;
  const left = ex - chartW / 2;
  const top = ey - chartH / 2 - 20;
  const axisY = top + chartH - 14;
  const axisX0 = left + 20;
  const axisX1 = left + chartW - 14;

  bgCtx.font = 'bold 12px Inter, "Segoe UI", system-ui, sans-serif';
  bgCtx.fillStyle = '#1f2937';
  bgCtx.textAlign = 'center';
  bgCtx.textBaseline = 'top';
  const titleDisp = title.length > 40 ? `${title.slice(0, 39)}…` : title;
  bgCtx.fillText(titleDisp, ex, top - 18);

  bgCtx.strokeStyle = '#9ca3af';
  bgCtx.lineWidth = 1.5;
  bgCtx.beginPath();
  bgCtx.moveTo(axisX0, axisY);
  bgCtx.lineTo(axisX1, axisY);
  bgCtx.stroke();

  const slot = (axisX1 - axisX0) / n;
  const barW = Math.max(14, slot * 0.5);
  const [r, g, b] = hexToRgb(accentColor);

  for (let i = 0; i < n; i++) {
    if (cancelled()) return;
    const cx = axisX0 + slot * (i + 0.5);
    const v = values[i];
    const h = Math.max(4, (v / maxV) * (chartH - 38));
    const bx = cx - barW / 2;
    bgCtx.fillStyle = `rgba(${r},${g},${b},0.88)`;
    bgCtx.fillRect(bx, axisY - h, barW, h);
    bgCtx.fillStyle = '#4b5563';
    bgCtx.font = '10px Inter, "Segoe UI", system-ui, sans-serif';
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'top';
    const lab = String(labels[i]);
    const labDisp = lab.length > 11 ? `${lab.slice(0, 10)}…` : lab;
    bgCtx.fillText(labDisp, cx, axisY + 5);
    drawPresentation(mainCtx, bgCanvas, handImg, cx, axisY - h / 2, cssW, cssH);
    onFrame();
    await sleep(160);
  }
}

async function animateGraphAxes(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number,
  y: number,
  color: string,
  cssW: number,
  cssH: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const size = 130;
  await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, x - size / 2, y, x + size / 2, y, color, 'x', cssW, cssH, onFrame, cancelled);
  if (cancelled()) return;

  await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, x, y + size / 2, x, y - size / 2, color, 'y', cssW, cssH, onFrame, cancelled);
  if (cancelled()) return;

  bgCtx.strokeStyle = '#dc2626';
  bgCtx.lineWidth = 2.5;
  const steps2 = 36;
  let lastX = x - size / 2;
  let lastY = y - ((-size / 2) * (-size / 2)) / (size / 2);

  for (let i = 1; i <= steps2; i++) {
    if (cancelled()) return;
    const t = (i / steps2 - 0.5) * size;
    const px = x + t;
    const py = y - (t * t) / (size / 2);

    bgCtx.beginPath();
    bgCtx.moveTo(lastX, lastY);
    bgCtx.lineTo(px, py);
    bgCtx.stroke();
    lastX = px;
    lastY = py;

    drawPresentation(mainCtx, bgCanvas, handImg, px, py, cssW, cssH);
    onFrame();
    await sleep(32);
  }
}

async function animateBulletPoints(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  anchorX: number,
  anchorY: number,
  bullets: string[],
  color: string,
  align: HAlign,
  maxWidth: number,
  cssW: number,
  cssH: number,
  charDelayMs: number,
  onFrame: () => void,
  cancelled: () => boolean,
) {
  const lineHeight = 30;
  let y = anchorY - ((bullets.length - 1) * lineHeight) / 2;

  for (let i = 0; i < bullets.length; i++) {
    if (cancelled()) return;
    const raw = bullets[i].trim().replace(/^[•\-–]\s*/, '');
    const bulletX =
      align === 'left'
        ? anchorX - maxWidth / 2
        : align === 'right'
          ? anchorX + maxWidth / 2 - 12
          : anchorX - 6;

    bgCtx.fillStyle = color;
    bgCtx.font = 'bold 14px Inter, "Segoe UI", sans-serif';
    bgCtx.textAlign = 'left';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillText('•', bulletX, y);
    drawPresentation(mainCtx, bgCanvas, handImg, bulletX, y, cssW, cssH);
    onFrame();
    await sleep(80);

    const textX = bulletX + 16;
    await animateText(
      bgCtx,
      mainCtx,
      bgCanvas,
      handImg,
      raw,
      textX,
      y,
      color,
      14,
      'left',
      maxWidth - 24,
      cssW,
      cssH,
      charDelayMs,
      onFrame,
      cancelled,
    );
    y += lineHeight;
    await sleep(120);
  }
}

// ── Stack Diagram ──────────────────────────────────────────────
async function animateStack(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number,
  content: string, color: string,
  cssW: number, cssH: number,
  onFrame: () => void, cancelled: () => boolean,
) {
  // content: "Title|elem1,elem2,elem3|push:X  or  pop"
  const parts = content.split('|');
  const title = parts[0]?.trim() || 'Stack';
  const elems = (parts[1] || '').split(',').map(s => s.trim()).filter(Boolean);
  const action = (parts[2] || '').trim();

  const cw = 90, ch = 36, gap = 2;
  const baseY = y + (elems.length * (ch + gap)) / 2;
  const sx = x - cw / 2;

  // title
  bgCtx.font = 'bold 14px Inter, "Segoe UI", sans-serif';
  bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
  bgCtx.fillText(title, x, baseY - elems.length * (ch + gap) - 22);
  drawPresentation(mainCtx, bgCanvas, handImg, x, y, cssW, cssH); onFrame();

  for (let i = 0; i < elems.length; i++) {
    if (cancelled()) return;
    const ey = baseY - i * (ch + gap) - ch;
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, sx, ey, cw, ch, color, cssW, cssH, onFrame, cancelled);
    const [r, g, b] = hexToRgb(color);
    bgCtx.fillStyle = `rgba(${r},${g},${b},0.1)`; bgCtx.fillRect(sx, ey, cw, ch);
    bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(elems[i], x, ey + ch / 2);
  }

  // TOP pointer
  const topRowY = baseY - elems.length * (ch + gap);
  bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif';
  bgCtx.fillStyle = '#059669'; bgCtx.textAlign = 'left';
  bgCtx.fillText('← TOP', sx + cw + 8, topRowY + ch / 2);
  drawPresentation(mainCtx, bgCanvas, handImg, sx + cw + 8, topRowY, cssW, cssH); onFrame();
  await sleep(200);

  if (action.startsWith('push:')) {
    const val = action.split(':')[1] || '?';
    const pushY = topRowY - (ch + gap);
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, sx, pushY, cw, ch, '#059669', cssW, cssH, onFrame, cancelled);
    bgCtx.fillStyle = 'rgba(5,150,105,0.15)'; bgCtx.fillRect(sx, pushY, cw, ch);
    bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = '#059669'; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(val, x, pushY + ch / 2);
    bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif';
    bgCtx.textAlign = 'right';
    bgCtx.fillText('PUSH →', sx - 6, pushY + ch / 2);
    drawPresentation(mainCtx, bgCanvas, handImg, x, pushY, cssW, cssH); onFrame();
  } else if (action === 'pop') {
    bgCtx.strokeStyle = '#dc2626'; bgCtx.lineWidth = 2.5; bgCtx.setLineDash([5, 3]);
    bgCtx.strokeRect(sx, topRowY, cw, ch);
    bgCtx.setLineDash([]);
    bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = '#dc2626'; bgCtx.textAlign = 'right';
    bgCtx.fillText('POP ↑', sx - 6, topRowY + ch / 2);
    drawPresentation(mainCtx, bgCanvas, handImg, x, topRowY, cssW, cssH); onFrame();
  }
}

// ── Queue Diagram ─────────────────────────────────────────────
async function animateQueue(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number,
  content: string, color: string,
  cssW: number, cssH: number,
  onFrame: () => void, cancelled: () => boolean,
) {
  const parts = content.split('|');
  const title = parts[0]?.trim() || 'Queue';
  const elems = (parts[1] || '').split(',').map(s => s.trim()).filter(Boolean);
  const action = (parts[2] || '').trim();

  const cw = Math.min(60, Math.floor((LOGICAL_W - 120) / Math.max(elems.length, 1)));
  const ch = 44;
  const totalW = elems.length * cw;
  const startX = x - totalW / 2;

  bgCtx.font = 'bold 14px Inter, "Segoe UI", sans-serif';
  bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
  bgCtx.fillText(title, x, y - ch / 2 - 22);

  for (let i = 0; i < elems.length; i++) {
    if (cancelled()) return;
    const ex = startX + i * cw;
    const ey = y - ch / 2;
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, ex, ey, cw, ch, color, cssW, cssH, onFrame, cancelled);
    const [r, g, b] = hexToRgb(color);
    bgCtx.fillStyle = `rgba(${r},${g},${b},0.1)`; bgCtx.fillRect(ex, ey, cw, ch);
    bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(elems[i], ex + cw / 2, y);
  }

  bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif'; bgCtx.textAlign = 'center';
  bgCtx.fillStyle = '#059669';
  bgCtx.fillText('FRONT', startX + cw / 2, y + ch / 2 + 14);
  bgCtx.fillStyle = '#7c3aed';
  bgCtx.fillText('REAR', startX + totalW - cw / 2, y + ch / 2 + 14);
  drawPresentation(mainCtx, bgCanvas, handImg, x, y, cssW, cssH); onFrame();
  await sleep(200);

  if (action.startsWith('enqueue:')) {
    const val = action.split(':')[1] || '?';
    const ex = startX + totalW;
    await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, ex + 46, y, ex + 4, y, '#7c3aed', 'ENQUEUE', cssW, cssH, onFrame, cancelled);
    if (cancelled()) return;
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, ex, y - ch / 2, cw, ch, '#7c3aed', cssW, cssH, onFrame, cancelled);
    bgCtx.fillStyle = 'rgba(124,58,237,0.12)'; bgCtx.fillRect(ex, y - ch / 2, cw, ch);
    bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = '#7c3aed'; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(val, ex + cw / 2, y);
  } else if (action === 'dequeue') {
    bgCtx.strokeStyle = '#dc2626'; bgCtx.lineWidth = 2.5; bgCtx.setLineDash([5, 3]);
    bgCtx.strokeRect(startX, y - ch / 2, cw, ch);
    bgCtx.setLineDash([]);
    await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, startX - 4, y, startX - 46, y, '#dc2626', 'DEQUEUE', cssW, cssH, onFrame, cancelled);
  }
}

// ── Array Diagram ─────────────────────────────────────────────
async function animateArrayDiagram(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number,
  content: string, color: string,
  cssW: number, cssH: number,
  onFrame: () => void, cancelled: () => boolean,
) {
  const parts = content.split('|');
  const title = parts[0]?.trim() || 'Array';
  const elems = (parts[1] || '').split(',').map(s => s.trim()).filter(Boolean);
  const hlStr = (parts[2] || '').trim();
  const hlIdx = hlStr.startsWith('highlight:') ? parseInt(hlStr.split(':')[1]) : -1;

  const cw = Math.min(62, Math.floor((LOGICAL_W - 80) / Math.max(elems.length, 1)));
  const ch = 44;
  const totalW = elems.length * cw;
  const startX = x - totalW / 2;

  bgCtx.font = 'bold 14px Inter, "Segoe UI", sans-serif';
  bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
  bgCtx.fillText(title, x, y - ch / 2 - 20);

  for (let i = 0; i < elems.length; i++) {
    if (cancelled()) return;
    const ex = startX + i * cw;
    const ey = y - ch / 2;
    const isHL = i === hlIdx;
    const cellColor = isHL ? '#dc2626' : color;
    await animateBox(bgCtx, mainCtx, bgCanvas, handImg, ex, ey, cw, ch, cellColor, cssW, cssH, onFrame, cancelled);
    const [r, g, b] = hexToRgb(cellColor);
    bgCtx.fillStyle = `rgba(${r},${g},${b},${isHL ? 0.2 : 0.08})`; bgCtx.fillRect(ex, ey, cw, ch);
    bgCtx.font = `bold 13px Inter, "Segoe UI", sans-serif`;
    bgCtx.fillStyle = cellColor; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(elems[i], ex + cw / 2, y);
    bgCtx.font = '10px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = '#9ca3af';
    bgCtx.fillText(`[${i}]`, ex + cw / 2, y + ch / 2 + 12);
    drawPresentation(mainCtx, bgCanvas, handImg, ex + cw / 2, y, cssW, cssH); onFrame();
  }

  if (hlIdx >= 0 && hlIdx < elems.length) {
    const arrowX = startX + hlIdx * cw + cw / 2;
    bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif';
    bgCtx.fillStyle = '#dc2626'; bgCtx.textAlign = 'center';
    bgCtx.fillText('▲ target', arrowX, y + ch / 2 + 28);
    drawPresentation(mainCtx, bgCanvas, handImg, arrowX, y, cssW, cssH); onFrame();
  }
}

// ── Linked List ───────────────────────────────────────────────
async function animateLinkedList(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number,
  content: string, color: string,
  cssW: number, cssH: number,
  onFrame: () => void, cancelled: () => boolean,
) {
  const parts = content.split('|');
  const title = parts[0]?.trim() || 'Linked List';
  const chain = (parts[1] || parts[0] || '').split('->').map(s => s.trim()).filter(Boolean);

  const dw = 56, pw = 20, ch = 38, gap = 28;
  const blockW = dw + pw;
  const totalW = chain.length * (blockW + gap) - gap;
  const startX = x - totalW / 2;

  bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
  bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
  bgCtx.fillText(title, x, y - ch / 2 - 18);

  for (let i = 0; i < chain.length; i++) {
    if (cancelled()) return;
    const nx = startX + i * (blockW + gap);
    const ny = y - ch / 2;
    const isNull = chain[i].toUpperCase() === 'NULL';

    if (isNull) {
      bgCtx.strokeStyle = '#9ca3af'; bgCtx.lineWidth = 1.8; bgCtx.setLineDash([4, 3]);
      bgCtx.strokeRect(nx, ny, dw, ch); bgCtx.setLineDash([]);
      bgCtx.font = 'bold 10px Inter, "Segoe UI", sans-serif';
      bgCtx.fillStyle = '#9ca3af'; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
      bgCtx.fillText('NULL', nx + dw / 2, y);
      bgCtx.fillStyle = '#6b7280';
      bgCtx.fillRect(nx + dw + 4, ny + ch / 4, pw - 8, ch / 2);
    } else {
      await animateBox(bgCtx, mainCtx, bgCanvas, handImg, nx, ny, dw, ch, color, cssW, cssH, onFrame, cancelled);
      const [r, g, b] = hexToRgb(color);
      bgCtx.fillStyle = `rgba(${r},${g},${b},0.1)`; bgCtx.fillRect(nx, ny, dw, ch);
      bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
      bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
      bgCtx.fillText(chain[i], nx + dw / 2, y);
      // pointer box
      bgCtx.strokeStyle = color; bgCtx.lineWidth = 1.5;
      bgCtx.strokeRect(nx + dw, ny, pw, ch);
      bgCtx.fillStyle = `rgba(${r},${g},${b},0.25)`;
      bgCtx.fillRect(nx + dw, ny, pw, ch);

      if (i < chain.length - 1) {
        await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, nx + dw + pw + 2, y, nx + dw + pw + gap - 2, y, color, '', cssW, cssH, onFrame, cancelled);
      }
    }
    if (i === 0) {
      bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif';
      bgCtx.fillStyle = '#059669'; bgCtx.textAlign = 'center';
      bgCtx.fillText('HEAD', nx + dw / 2, ny + ch + 14);
    }
    drawPresentation(mainCtx, bgCanvas, handImg, nx + dw / 2, y, cssW, cssH); onFrame();
  }
}

// ── DFA / NFA Diagram ─────────────────────────────────────────
async function animateDFA(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number,
  content: string, color: string,
  cssW: number, cssH: number,
  onFrame: () => void, cancelled: () => boolean,
) {
  // content: "q0,q1,q2|accept:q2|q0->q1:0,q1->q2:1,q0->q0:1"
  const parts = content.split('|');
  const states = (parts[0] || 'q0').split(',').map(s => s.trim()).filter(Boolean);
  const acceptStr = (parts[1] || '').replace(/^accept:/i, '');
  const accepts = new Set(acceptStr.split(',').map(s => s.trim()).filter(Boolean));
  const transStr = parts[2] || '';
  const transitions = transStr.split(',').map(t => {
    const m = t.trim().match(/^(\w+)->(\w+):(.+)$/);
    return m ? { from: m[1], to: m[2], label: m[3] } : null;
  }).filter((t): t is { from: string; to: string; label: string } => Boolean(t));

  const r = 28;
  const spacing = Math.min(130, (LOGICAL_W - 100) / Math.max(states.length, 1));
  const startX = x - ((states.length - 1) * spacing) / 2;

  const pos: Record<string, [number, number]> = {};
  states.forEach((s, i) => { pos[s] = [startX + i * spacing, y]; });

  // start arrow
  if (states.length > 0) {
    const [sx, sy] = pos[states[0]];
    await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, sx - r - 36, sy, sx - r - 2, sy, color, '', cssW, cssH, onFrame, cancelled);
  }

  // draw states
  for (const s of states) {
    if (cancelled()) return;
    const [sx, sy] = pos[s];
    await animateCircle(bgCtx, mainCtx, bgCanvas, handImg, sx, sy, r, color, s, cssW, cssH, onFrame, cancelled);
    if (accepts.has(s)) {
      // double circle for accept state
      bgCtx.beginPath();
      bgCtx.arc(sx, sy, r - 5, 0, Math.PI * 2);
      bgCtx.strokeStyle = color; bgCtx.lineWidth = 2;
      bgCtx.stroke();
      drawPresentation(mainCtx, bgCanvas, handImg, sx, sy, cssW, cssH); onFrame();
    }
  }

  // draw transitions
  const drawnLabels: Record<string, string[]> = {};
  for (const tr of transitions) {
    if (cancelled()) break;
    const fp = pos[tr.from]; const tp = pos[tr.to];
    if (!fp || !tp) continue;
    const key = `${tr.from}->${tr.to}`;

    if (tr.from === tr.to) {
      // self-loop above the state
      const lx = fp[0], ly = fp[1] - r;
      bgCtx.beginPath();
      bgCtx.arc(lx, ly - 16, 16, 0.3, Math.PI - 0.3);
      bgCtx.strokeStyle = color; bgCtx.lineWidth = 2; bgCtx.stroke();
      bgCtx.font = 'bold 12px Inter, "Segoe UI", sans-serif';
      bgCtx.fillStyle = color; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
      bgCtx.fillText(tr.label, lx, ly - 36);
      drawPresentation(mainCtx, bgCanvas, handImg, lx, ly - 36, cssW, cssH); onFrame();
    } else {
      // combine labels for same-direction edges
      if (!drawnLabels[key]) {
        drawnLabels[key] = [];
        const angle = Math.atan2(tp[1] - fp[1], tp[0] - fp[0]);
        const x1 = fp[0] + r * Math.cos(angle), y1 = fp[1] + r * Math.sin(angle);
        const x2 = tp[0] - r * Math.cos(angle), y2 = tp[1] - r * Math.sin(angle);
        // collect all labels for this pair first
        const allLabels = transitions.filter(t => t.from === tr.from && t.to === tr.to).map(t => t.label).join('/');
        await animateArrow(bgCtx, mainCtx, bgCanvas, handImg, x1, y1, x2, y2, color, allLabels, cssW, cssH, onFrame, cancelled);
        drawnLabels[key] = [allLabels];
      }
    }
    await sleep(80);
  }
}

// ── Binary Tree Diagram ───────────────────────────────────────
async function animateBinaryTree(
  bgCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  handImg: HTMLImageElement | null,
  x: number, y: number,
  content: string, color: string,
  cssW: number, cssH: number,
  onFrame: () => void, cancelled: () => boolean,
) {
  // content: BFS order values "50,30,70,20,40,60,80" (max 7)
  const vals = content.split(',').map(s => s.trim()).filter(Boolean).slice(0, 7);
  const nodeR = 22;
  const levelGap = 72;
  const levels = Math.ceil(Math.log2(vals.length + 1));
  const topY = y - ((levels - 1) * levelGap) / 2;

  // compute positions
  const positions: Array<[number, number]> = vals.map((_, i) => {
    const lvl = Math.floor(Math.log2(i + 1));
    const posInLvl = i - (Math.pow(2, lvl) - 1);
    const countInLvl = Math.pow(2, lvl);
    const spread = Math.min(560, countInLvl * 80);
    const nx = x - spread / 2 + spread / countInLvl * (posInLvl + 0.5);
    const ny = topY + lvl * levelGap;
    return [nx, ny];
  });

  // draw edges first (fast)
  for (let i = 0; i < vals.length; i++) {
    for (const child of [2 * i + 1, 2 * i + 2]) {
      if (child >= vals.length) continue;
      const [px, py] = positions[i], [cx, cy] = positions[child];
      const angle = Math.atan2(cy - py, cx - px);
      bgCtx.beginPath();
      bgCtx.moveTo(px + nodeR * Math.cos(angle), py + nodeR * Math.sin(angle));
      bgCtx.lineTo(cx - nodeR * Math.cos(angle), cy - nodeR * Math.sin(angle));
      bgCtx.strokeStyle = color; bgCtx.lineWidth = 2; bgCtx.stroke();
      drawPresentation(mainCtx, bgCanvas, handImg, cx, cy, cssW, cssH); onFrame();
      await sleep(60);
    }
  }

  // draw nodes
  for (let i = 0; i < vals.length; i++) {
    if (cancelled()) return;
    const [nx, ny] = positions[i];
    await animateCircle(bgCtx, mainCtx, bgCanvas, handImg, nx, ny, nodeR, color, vals[i], cssW, cssH, onFrame, cancelled);
    if (i === 0) {
      bgCtx.font = 'bold 11px Inter, "Segoe UI", sans-serif';
      bgCtx.fillStyle = '#059669'; bgCtx.textAlign = 'center';
      bgCtx.fillText('root', nx, ny - nodeR - 10);
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

interface Props {
  script: WBScript;
  chartData?: MessageItem['chartData'] | null;
}

export default function WhiteboardAnimPlayer({ script, chartData = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelRef = useRef(false);
  const playingRef = useRef(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const handImgRef = useRef<HTMLImageElement | null>(null);
  const cssSizeRef = useRef({ w: LOGICAL_W, h: LOGICAL_H });

  const [playing, setPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [caption, setCaption] = useState('');

  const syncCanvasPixels = useCallback(() => {
    const stage = stageRef.current;
    const mainEl = canvasRef.current;
    if (!stage || !mainEl) return;

    const rect = stage.getBoundingClientRect();
    let cssW = Math.max(280, rect.width);
    let cssH = (cssW * LOGICAL_H) / LOGICAL_W;
    const maxH = isFullscreen ? window.innerHeight * 0.72 : 420;
    if (cssH > maxH) {
      cssH = maxH;
      cssW = (cssH * LOGICAL_W) / LOGICAL_H;
    }

    cssSizeRef.current = { w: cssW, h: cssH };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const physW = Math.round(cssW * dpr);
    const physH = Math.round(cssH * dpr);

    mainEl.width = physW;
    mainEl.height = physH;
    mainEl.style.width = `${cssW}px`;
    mainEl.style.height = `${cssH}px`;

    let bg = bgCanvasRef.current;
    if (!bg) {
      bg = document.createElement('canvas');
      bgCanvasRef.current = bg;
    }
    bg.width = physW;
    bg.height = physH;

    const mainCtx = mainEl.getContext('2d');
    const bgCtx = bg.getContext('2d');
    if (mainCtx) applyCanvasTransform(mainCtx, cssW, cssH);
    if (bgCtx) applyCanvasTransform(bgCtx, cssW, cssH);
  }, [isFullscreen]);

  useLayoutEffect(() => {
    syncCanvasPixels();
  }, [syncCanvasPixels, isFullscreen]);

  useEffect(() => {
    const onResize = () => {
      if (playingRef.current) return;
      syncCanvasPixels();
      const mainCtx = canvasRef.current?.getContext('2d');
      const bg = bgCanvasRef.current;
      if (!mainCtx || !bg) return;
      const { w, h } = cssSizeRef.current;
      applyCanvasTransform(mainCtx, w, h);
      const bgCtx = bg.getContext('2d');
      if (bgCtx) {
        applyCanvasTransform(bgCtx, w, h);
        clearBg(bgCtx, mainCtx, bg, w, h, null);
      }
    };
    window.addEventListener('resize', onResize);
    const ro = stageRef.current && new ResizeObserver(onResize);
    if (stageRef.current && ro) ro.observe(stageRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [syncCanvasPixels]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => {
    if (!handImgRef.current) {
      const img = new Image();
      processHandImageAdvanced(handBase64)
        .then(processedImage => {
          img.src = processedImage;
          img.onload = () => {
            handImgRef.current = img;
          };
          img.onerror = () => {
            img.src = handBase64;
            img.onload = () => {
              handImgRef.current = img;
            };
          };
        })
        .catch(() => {
          img.src = handBase64;
          img.onload = () => {
            handImgRef.current = img;
          };
        });
    }
  }, []);

  const clearBg = useCallback(
    (
      bgCtx: CanvasRenderingContext2D,
      mainCtx: CanvasRenderingContext2D,
      bgCanvas: HTMLCanvasElement,
      cssW: number,
      cssH: number,
      hand: HTMLImageElement | null,
    ) => {
      applyCanvasTransform(bgCtx, cssW, cssH);
      bgCtx.fillStyle = '#fafafa';
      bgCtx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      bgCtx.strokeStyle = 'rgba(0,0,0,0.05)';
      bgCtx.lineWidth = 1;
      for (let gx = 0; gx < LOGICAL_W; gx += 40) {
        bgCtx.beginPath();
        bgCtx.moveTo(gx, 0);
        bgCtx.lineTo(gx, LOGICAL_H);
        bgCtx.stroke();
      }
      for (let gy = 0; gy < LOGICAL_H; gy += 40) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, gy);
        bgCtx.lineTo(LOGICAL_W, gy);
        bgCtx.stroke();
      }
      drawPresentation(mainCtx, bgCanvas, hand, -1, -1, cssW, cssH);
    },
    [],
  );

  const clearCanvas = useCallback(() => {
    const mainEl = canvasRef.current;
    let bg = bgCanvasRef.current;
    if (!mainEl) return;
    if (!bg) {
      bg = document.createElement('canvas');
      bgCanvasRef.current = bg;
    }
    const { w, h } = cssSizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bg.width = Math.round(w * dpr);
    bg.height = Math.round(h * dpr);
    mainEl.width = bg.width;
    mainEl.height = bg.height;
    mainEl.style.width = `${w}px`;
    mainEl.style.height = `${h}px`;

    const mainCtx = mainEl.getContext('2d');
    const bgCtx = bg.getContext('2d');
    if (!mainCtx || !bgCtx) return;
    applyCanvasTransform(mainCtx, w, h);
    applyCanvasTransform(bgCtx, w, h);
    clearBg(bgCtx, mainCtx, bg, w, h, null);
  }, [clearBg]);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise<void>(resolve => {
        if (muted || !window.speechSynthesis) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = speechRate;
        utt.pitch = 1.02;
        utt.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
          voices.find(v => v.lang.startsWith('en-IN')) ||
          voices.find(v => v.lang.startsWith('en'));
        if (preferred) utt.voice = preferred;
        utt.onend = () => resolve();
        utt.onerror = () => resolve();
        utterRef.current = utt;
        window.speechSynthesis.speak(utt);
      });
    },
    [muted, speechRate],
  );

  const drawScene = useCallback(
    async (scene: Scene) => {
      syncCanvasPixels();
      const mainEl = canvasRef.current;
      const bgCanvas = bgCanvasRef.current;
      if (!mainEl || !bgCanvas) return;
      const mainCtx = mainEl.getContext('2d');
      const bgCtx = bgCanvas.getContext('2d');
      if (!mainCtx || !bgCtx) return;

      const { w: cssW, h: cssH } = cssSizeRef.current;
      cancelRef.current = false;
      clearCanvas();
      applyCanvasTransform(bgCtx, cssW, cssH);
      applyCanvasTransform(mainCtx, cssW, cssH);

      const narrationSpoken = narrationForSpeech(scene.narration);
      setCaption(narrationSpoken);

      bgCtx.fillStyle = '#4f46e5';
      bgCtx.beginPath();
      bgCtx.arc(28, 28, 18, 0, Math.PI * 2);
      bgCtx.fill();
      bgCtx.font = 'bold 14px Inter, "Segoe UI", sans-serif';
      bgCtx.fillStyle = '#fff';
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';
      bgCtx.fillText(`${scene.scene_number}`, 28, 28);
      drawPresentation(mainCtx, bgCanvas, null, -1, -1, cssW, cssH);

      const onFrame = () => {};
      const cancelled = () => cancelRef.current;
      const speechPromise = speak(narrationSpoken);
      const charMs = Math.round(42 / Math.max(0.5, speechRate));

      for (const el of scene.elements) {
        if (cancelled()) break;
        const [rx, ry] = getPos(el.position);
        const ex = rx * LOGICAL_W;
        const ey = ry * LOGICAL_H;
        const hAlign = hAlignForPosition(el.position);
        const maxTw = maxTextWidth(el.position);
        const hImg = handImgRef.current;

        switch (el.type) {
          case 'text':
            await animateText(
              bgCtx,
              mainCtx,
              bgCanvas,
              hImg,
              whiteboardElementText(el.content),
              ex,
              ey,
              el.color,
              21,
              hAlign,
              maxTw,
              cssW,
              cssH,
              charMs,
              onFrame,
              cancelled,
            );
            break;
          case 'box': {
            bgCtx.font = 'bold 16px Inter, "Segoe UI", sans-serif';
            const lines = wrapLines(bgCtx, whiteboardElementText(el.content), maxTw - 24);
            const bw = Math.min(
              Math.max(...lines.map(l => bgCtx.measureText(l).width), 40) + 36,
              maxTw + 40,
            );
            const bh = Math.max(46, lines.length * 22 + 20);
            await animateBox(bgCtx, mainCtx, bgCanvas, hImg, ex - bw / 2, ey - bh / 2, bw, bh, el.color, cssW, cssH, onFrame, cancelled);
            if (!cancelled()) {
              bgCtx.font = 'bold 17px Inter, "Segoe UI", sans-serif';
              bgCtx.fillStyle = el.color;
              bgCtx.textAlign = 'center';
              bgCtx.textBaseline = 'middle';
              const startY = ey - ((lines.length - 1) * 22) / 2;
              lines.forEach((ln, i) => {
                bgCtx.fillText(ln, ex, startY + i * 22);
              });
              drawPresentation(mainCtx, bgCanvas, hImg, ex, ey, cssW, cssH);
            }
            break;
          }
          case 'arrow': {
            const arrowRaw = whiteboardElementText(el.content);
            const parts = arrowRaw.split(FLOW_STEP_SPLIT);
            const label = parts.length > 1 ? parts[parts.length - 1].trim() : arrowRaw;
            await animateArrow(bgCtx, mainCtx, bgCanvas, hImg, ex - 85, ey, ex + 85, ey, el.color, label, cssW, cssH, onFrame, cancelled);
            break;
          }
          case 'circle':
            await animateCircle(
              bgCtx,
              mainCtx,
              bgCanvas,
              hImg,
              ex,
              ey,
              44,
              el.color,
              whiteboardElementText(el.content).slice(0, 14),
              cssW,
              cssH,
              onFrame,
              cancelled,
            );
            break;
          case 'icon':
            if (!cancelled()) {
              bgCtx.font = '46px serif';
              bgCtx.textAlign = 'center';
              bgCtx.textBaseline = 'middle';
              const iconLine = whiteboardElementText(el.content);
              const icon = iconLine.split(/\s/)[0] || '💡';
              bgCtx.fillText(icon, ex, ey - 18);
              const rest = iconLine.replace(/^[^\s]+\s*/, '').trim();
              if (rest) {
                bgCtx.font = 'bold 13px Inter, "Segoe UI", sans-serif';
                bgCtx.fillStyle = el.color;
                await animateText(
                  bgCtx,
                  mainCtx,
                  bgCanvas,
                  hImg,
                  rest,
                  ex,
                  ey + 26,
                  el.color,
                  13,
                  'center',
                  maxTw,
                  cssW,
                  cssH,
                  charMs,
                  onFrame,
                  cancelled,
                );
              } else {
                drawPresentation(mainCtx, bgCanvas, hImg, ex, ey, cssW, cssH);
              }
              await sleep(200);
            }
            break;
          case 'underline':
            if (!cancelled()) {
              bgCtx.font = 'bold 19px Inter, "Segoe UI", sans-serif';
              bgCtx.fillStyle = el.color;
              bgCtx.textAlign = 'center';
              bgCtx.textBaseline = 'middle';
              const uLines = wrapLines(bgCtx, whiteboardElementText(el.content), maxTw);
              const uLh = 24;
              let uy = ey - ((uLines.length - 1) * uLh) / 2;
              for (const ln of uLines) {
                if (cancelled()) break;
                bgCtx.fillText(ln, ex, uy);
                const tw = bgCtx.measureText(ln).width;
                await animateArrow(
                  bgCtx,
                  mainCtx,
                  bgCanvas,
                  hImg,
                  ex - tw / 2,
                  uy + 12,
                  ex + tw / 2,
                  uy + 12,
                  el.color,
                  '',
                  cssW,
                  cssH,
                  onFrame,
                  cancelled,
                );
                uy += uLh;
              }
            }
            break;
          case 'flowchart':
            await animateFlowchart(
              bgCtx,
              mainCtx,
              bgCanvas,
              hImg,
              ex,
              ey,
              whiteboardElementText(el.content),
              el.color,
              cssW,
              cssH,
              onFrame,
              cancelled,
            );
            break;
          case 'formula_box':
            await animateFormulaBox(
              bgCtx,
              mainCtx,
              bgCanvas,
              hImg,
              ex,
              ey,
              whiteboardElementText(el.content),
              el.color,
              cssW,
              cssH,
              onFrame,
              cancelled,
            );
            break;
          case 'graph_axes':
            await animateGraphAxes(bgCtx, mainCtx, bgCanvas, hImg, ex, ey, el.color, cssW, cssH, onFrame, cancelled);
            break;
          case 'bullets': {
            const bullets = el.content
              .split('\n')
              .map(s => whiteboardElementText(s).trim())
              .filter(Boolean);
            await animateBulletPoints(
              bgCtx,
              mainCtx,
              bgCanvas,
              hImg,
              ex,
              ey,
              bullets,
              el.color,
              hAlign,
              maxTw,
              cssW,
              cssH,
              charMs,
              onFrame,
              cancelled,
            );
            break;
          }
          case 'chart':
            if (chartData && chartData.labels.length >= 2) {
              await animateBarChart(
                bgCtx,
                mainCtx,
                bgCanvas,
                hImg,
                ex,
                ey,
                chartData,
                el.color,
                cssW,
                cssH,
                onFrame,
                cancelled,
              );
            } else {
              bgCtx.font = '13px Inter, "Segoe UI", sans-serif';
              bgCtx.fillStyle = '#6b7280';
              bgCtx.textAlign = 'center';
              bgCtx.textBaseline = 'middle';
              bgCtx.fillText('Comparison chart — open slides for data', ex, ey);
              drawPresentation(mainCtx, bgCanvas, null, -1, -1, cssW, cssH);
            }
            break;
          case 'stack_diagram':
            await animateStack(bgCtx, mainCtx, bgCanvas, hImg, ex, ey,
              whiteboardElementText(el.content), el.color, cssW, cssH, onFrame, cancelled);
            break;
          case 'queue_diagram':
            await animateQueue(bgCtx, mainCtx, bgCanvas, hImg, ex, ey,
              whiteboardElementText(el.content), el.color, cssW, cssH, onFrame, cancelled);
            break;
          case 'array_diagram':
            await animateArrayDiagram(bgCtx, mainCtx, bgCanvas, hImg, ex, ey,
              whiteboardElementText(el.content), el.color, cssW, cssH, onFrame, cancelled);
            break;
          case 'linked_list':
            await animateLinkedList(bgCtx, mainCtx, bgCanvas, hImg, ex, ey,
              whiteboardElementText(el.content), el.color, cssW, cssH, onFrame, cancelled);
            break;
          case 'dfa_diagram':
            await animateDFA(bgCtx, mainCtx, bgCanvas, hImg, ex, ey,
              whiteboardElementText(el.content), el.color, cssW, cssH, onFrame, cancelled);
            break;
          case 'tree_diagram':
            await animateBinaryTree(bgCtx, mainCtx, bgCanvas, hImg, ex, ey,
              whiteboardElementText(el.content), el.color, cssW, cssH, onFrame, cancelled);
            break;
        }

        drawPresentation(mainCtx, bgCanvas, null, -1, -1, cssW, cssH);
        await sleep(240);
      }

      await speechPromise;
    },
    [clearCanvas, speak, syncCanvasPixels, chartData],
  );

  const runScene = useCallback(
    async (idx: number) => {
      if (idx >= script.scenes.length) {
        playingRef.current = false;
        setPlaying(false);
        setDone(true);
        setCaption('');
        return;
      }
      setCurrentScene(idx);
      const scene = script.scenes[idx];
      await drawScene(scene);
      if (!cancelRef.current) {
        await sleep(scene.duration * 1000);
        if (!cancelRef.current) runScene(idx + 1);
      }
    },
    [script.scenes, drawScene],
  );

  const start = useCallback(() => {
    setDone(false);
    playingRef.current = true;
    setPlaying(true);
    syncCanvasPixels();
    clearCanvas();
    runScene(0);
  }, [clearCanvas, runScene, syncCanvasPixels]);

  const pause = useCallback(() => {
    cancelRef.current = true;
    playingRef.current = false;
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setCaption('');
  }, []);

  const nextScene = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    const next = Math.min(currentScene + 1, script.scenes.length - 1);
    cancelRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    setDone(false);
    runScene(next);
  }, [currentScene, script.scenes.length, runScene]);

  const restart = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    setTimeout(() => {
      cancelRef.current = false;
      start();
    }, 80);
  }, [start]);

  useEffect(() => {
    syncCanvasPixels();
    clearCanvas();
    return () => {
      cancelRef.current = true;
      window.speechSynthesis?.cancel();
    };
  }, [clearCanvas, syncCanvasPixels]);

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          pause();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          setMuted(m => !m);
          window.speechSynthesis?.cancel();
          break;
        case 'ArrowRight':
          nextScene();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, pause, toggleFullscreen, nextScene]);

  const totalScenes = script.scenes.length;
  const sceneProgress = totalScenes ? ((currentScene + (playing ? 0.35 : 0)) / totalScenes) * 100 : 0;

  return (
    <motion.div
      ref={shellRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden border border-amber-200 shadow-xl bg-white dark:bg-gpai-surface ${
        isFullscreen ? 'fixed inset-0 z-[998] rounded-none flex flex-col' : ''
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-b border-amber-100 dark:border-amber-900/40 ${
          isFullscreen ? 'shrink-0' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">✏️</span>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-200 tracking-wide uppercase shrink-0">Whiteboard</span>
          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium truncate">{script.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-0.5 max-w-[120px]">
            {Array.from({ length: totalScenes }).map((_, i) => (
              <button
                key={i}
                type="button"
                title={`Scene ${i + 1}`}
                onClick={() => {
                  cancelRef.current = true;
                  window.speechSynthesis?.cancel();
                  cancelRef.current = false;
                  playingRef.current = true;
                  setPlaying(true);
                  setDone(false);
                  runScene(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentScene && playing ? 'w-5 bg-amber-500' : i < currentScene ? 'w-2 bg-amber-400' : 'w-2 bg-amber-200 dark:bg-amber-800'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-200"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`relative bg-[#fafafa] dark:bg-[#0f172a] flex justify-center items-center ${isFullscreen ? 'flex-1 min-h-0' : ''}`}
      >
        <canvas ref={canvasRef} className="block max-w-full h-auto touch-none" style={{ background: '#fafafa' }} />
        {!playing && !done && currentScene === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 dark:bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-3 px-4">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto shadow-lg border-2 border-amber-200 dark:border-amber-700">
                <span className="text-4xl">✏️</span>
              </div>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{script.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalScenes} scenes · Space: pause · F: fullscreen · M: mute
              </p>
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:scale-105 active:scale-95 mx-auto"
              >
                <Play size={16} fill="white" /> Start
              </button>
            </div>
          </div>
        )}
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/85 dark:bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="text-base font-bold text-gray-800 dark:text-white">Complete</p>
              <button
                type="button"
                onClick={restart}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-5 py-2 rounded-xl text-sm font-semibold mx-auto"
              >
                <RefreshCw size={14} /> Replay
              </button>
            </div>
          </div>
        )}
      </div>

      {caption && playing && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gpai-surface-2 border-t border-gray-100 dark:border-gpai-border max-h-20 overflow-y-auto">
          <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">{caption}</p>
        </div>
      )}

      <div className="h-1 bg-amber-100 dark:bg-amber-950/50">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, sceneProgress)}%` }}
        />
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-t border-amber-100 dark:border-amber-900/40 flex-wrap">
        {playing ? (
          <button
            type="button"
            onClick={pause}
            className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white"
            title="Pause (Space)"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white"
            title="Play"
          >
            <Play size={14} fill="white" />
          </button>
        )}
        <button
          type="button"
          onClick={nextScene}
          disabled={currentScene >= totalScenes - 1}
          className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 disabled:opacity-40 flex items-center justify-center text-amber-800 dark:text-amber-200"
          title="Next scene (→)"
        >
          <SkipForward size={14} />
        </button>
        <button
          type="button"
          onClick={restart}
          className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 flex items-center justify-center text-amber-800 dark:text-amber-200"
        >
          <RefreshCw size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            setMuted(p => !p);
            window.speechSynthesis?.cancel();
          }}
          className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 flex items-center justify-center text-amber-800 dark:text-amber-200"
          title="Mute (M)"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSpeedMenu(p => !p)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-[11px] font-medium text-amber-900 dark:text-amber-100"
            title="Narration speed"
          >
            <Gauge size={12} /> {speechRate.toFixed(2)}×
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gpai-surface-2 border border-gray-200 dark:border-gpai-border rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
              {[0.65, 0.85, 1, 1.15].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`w-full text-left px-3 py-1 text-xs ${speechRate === r ? 'text-amber-600 font-semibold' : 'text-gray-700 dark:text-gray-200'}`}
                  onClick={() => {
                    setSpeechRate(r);
                    setShowSpeedMenu(false);
                  }}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[11px] text-amber-800 dark:text-amber-200 font-medium ml-auto">
          Scene {currentScene + 1} / {totalScenes}
        </span>
        {playing && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Drawing
          </span>
        )}
      </div>
    </motion.div>
  );
}
