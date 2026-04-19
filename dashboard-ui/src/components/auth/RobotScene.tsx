import { useEffect, useRef, useState } from 'react';

interface RobotSceneProps {
  isExplaining: boolean;
}

const MAIN_LINE1 = 'Learn with';
const MAIN_LINE2 = 'AI Tutor';

/** greet → turn toward board → raise arm → write → turn back to viewers → greet */
type RobotTeachPhase = 'greet' | 'turnBoard' | 'armUp' | 'writing' | 'turnViewer';

function GreenBoard({
  mainLine1,
  mainLine2,
  showCaret,
}: {
  mainLine1: string;
  mainLine2: string;
  showCaret: boolean;
}) {
  const chalkFont =
    '"Patrick Hand", "Comic Neue", "Segoe Print", "Bradley Hand", "Chalkboard SE", cursive, sans-serif';

  return (
    <div
      className="relative overflow-hidden shadow-2xl transition-all duration-700"
      style={{
        width: 'min(78vw, 420px)',
        maxWidth: '100%',
        /* Keep width∶height fixed whenever you scale — only change `width` to resize */
        aspectRatio: '4 / 3.35',
        containerType: 'size',
        background: 'linear-gradient(165deg, #3d6b4f 0%, #2d5a42 38%, #1a3d28 100%)',
        border: '8px solid #4a3c2e',
        borderRadius: '2px',
        boxShadow:
          'inset 0 2px 0 rgba(255,255,255,0.05), 0 5px 0 #2c241c, 0 16px 36px rgba(0,0,0,0.38)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' seed=\'2\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23n)\' opacity=\'0.55\'/%3E%3C/svg%3E")',
          backgroundSize: '72px 72px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 25%, rgba(255,255,255,0.07) 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,0,0,0.12) 0%, transparent 50%)',
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-6 md:px-8">
        <h2
          className="w-full text-center font-bold leading-[1.08] text-white"
          style={{
            fontFamily: chalkFont,
            fontSize: 'clamp(1.2rem, min(12cqw, 16cqh), 2.65rem)',
            letterSpacing: '0.02em',
            maxWidth: '92%',
            textShadow: '3px 3px 0 rgba(0,0,0,0.22), 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          <span className="block">
            {mainLine1}
            {showCaret && mainLine1.length < MAIN_LINE1.length && (
              <span className="ml-0.5 inline-block align-middle" style={{ animation: 'chalk-caret 0.7s step-end infinite' }}>
                |
              </span>
            )}
          </span>
          <span className="block">
            {mainLine2}
            {showCaret && mainLine1.length >= MAIN_LINE1.length && mainLine2.length < MAIN_LINE2.length && (
              <span className="ml-0.5 inline-block align-middle" style={{ animation: 'chalk-caret 0.7s step-end infinite' }}>
                |
              </span>
            )}
          </span>
        </h2>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-1.5 opacity-25"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }}
      />
    </div>
  );
}

function RobotSVG({ phase }: { phase: RobotTeachPhase }) {
  const facingBoard = phase === 'turnBoard' || phase === 'armUp' || phase === 'writing';
  const scribble = phase === 'writing';
  const armRaised = phase === 'armUp' || phase === 'writing';

  return (
    <svg
      className="robot-glow robot-scene-svg"
      viewBox="-30 -80 260 440"
      style={{
        width: 'min(72%, 300px)',
        minWidth: 200,
        maxWidth: 340,
        height: 'auto',
        overflow: 'visible',
        filter: 'drop-shadow(0 24px 20px rgba(15,23,42,0.33)) drop-shadow(0 0 16px rgba(34,211,238,0.12))',
      }}
      aria-hidden
    >
      <defs>
        <radialGradient id="ch-white" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f4f4f5" />
          <stop offset="100%" stopColor="#d4d4d8" />
        </radialGradient>
        <linearGradient id="ch-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e4e4e7" />
          <stop offset="50%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#71717a" />
        </linearGradient>
        <linearGradient id="ch-chalk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="70%" stopColor="#e7e7ea" />
          <stop offset="100%" stopColor="#c4c4cc" />
        </linearGradient>
        <filter id="ch-cyan-glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Whole figure turns toward/away from board (horizontal flip about x = 100) */}
      <g
        style={{
          transformOrigin: '100px 302px',
          transform: facingBoard ? 'scaleX(-1)' : 'scaleX(1)',
          transition: 'transform 0.78s cubic-bezier(0.33, 1, 0.64, 1)',
        }}
      >
        <g style={{ transform: 'translate(4px, 0)', transformOrigin: '100px 268px' }}>
          <ellipse cx="78" cy="318" rx="27" ry="15" fill="url(#ch-white)" stroke="#d4d4d8" strokeWidth="0.8" />
          <ellipse cx="122" cy="318" rx="27" ry="15" fill="url(#ch-white)" stroke="#d4d4d8" strokeWidth="0.8" />
          <ellipse cx="78" cy="320" rx="19" ry="8" fill="#71717a" />
          <ellipse cx="122" cy="320" rx="19" ry="8" fill="#71717a" />

          <path
            d="M 72 228 L 66 298 Q 66 308 78 312 L 90 312 Q 96 308 94 298 L 90 228 Z"
            fill="url(#ch-white)"
            stroke="#e4e4e7"
            strokeWidth="0.6"
          />
          <path
            d="M 128 228 L 134 298 Q 134 308 122 312 L 110 312 Q 104 308 106 298 L 110 228 Z"
            fill="url(#ch-white)"
            stroke="#e4e4e7"
            strokeWidth="0.6"
          />
          <circle cx="80" cy="262" r="9" fill="url(#ch-silver)" stroke="#52525b" strokeWidth="0.4" />
          <circle cx="120" cy="262" r="9" fill="url(#ch-silver)" stroke="#52525b" strokeWidth="0.4" />
          <circle cx="80" cy="262" r="4" fill="#22d3ee" opacity="0.32" filter="url(#ch-cyan-glow)" />
          <circle cx="120" cy="262" r="4" fill="#22d3ee" opacity="0.32" filter="url(#ch-cyan-glow)" />

          <rect x="78" y="212" width="44" height="20" rx="6" fill="#18181b" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="82"
              y1={216 + i * 3.5}
              x2="118"
              y2={216 + i * 3.5}
              stroke="#27272a"
              strokeWidth="1.1"
            />
          ))}

          <rect x="72" y="148" width="56" height="68" rx="18" fill="url(#ch-white)" stroke="#e4e4e7" strokeWidth="0.9" />
          <ellipse cx="84" cy="162" rx="5" ry="5" fill="#22d3ee" filter="url(#ch-cyan-glow)" opacity="0.95" />
          <path d="M 78 168 Q 100 174 122 168" stroke="rgba(255,255,255,0.45)" strokeWidth="1" fill="none" />

          {/* Left arm */}
          <g transform="translate(62, 158)">
            <circle cx="0" cy="0" r="10" fill="url(#ch-silver)" stroke="#52525b" strokeWidth="0.35" />
            <path
              d="M -8 2 L -12 44 Q -13 52 -6 54 L 6 54 Q 13 52 12 44 L 8 2 Q 6 -2 0 -2 Q -6 -2 -8 2 Z"
              fill="url(#ch-white)"
              stroke="#e4e4e7"
              strokeWidth="0.6"
            />
            <circle cx="-10" cy="34" r="6" fill="url(#ch-silver)" stroke="#52525b" strokeWidth="0.35" />
            <rect x="-8" y="50" width="14" height="12" rx="5" fill="#27272a" />
            <rect x="-6" y="60" width="4" height="12" rx="2" fill="url(#ch-white)" stroke="#18181b" strokeWidth="0.45" />
            <rect x="-1" y="60" width="4" height="11" rx="2" fill="url(#ch-white)" stroke="#18181b" strokeWidth="0.45" />
            <rect x="4" y="60" width="4" height="10" rx="2" fill="url(#ch-white)" stroke="#18181b" strokeWidth="0.45" />
          </g>

          {/* Neck follows body flip; head uses counter-flip + swap artwork so “back” is not a mirrored face */}
          <rect x="88" y="136" width="24" height="16" rx="4" fill="#18181b" />
          <line x1="90" y1="140" x2="110" y2="140" stroke="#27272a" strokeWidth="1" />
          <line x1="90" y1="144" x2="110" y2="144" stroke="#27272a" strokeWidth="1" />
          <line x1="90" y1="148" x2="110" y2="148" stroke="#27272a" strokeWidth="1" />

          {/* Cancels parent scaleX(-1) for this subtree (reflect x=100 twice → upright), so we can swap to a real “back” draw */}
          <g
            style={{
              transform: facingBoard ? 'translate(100px, 0) scaleX(-1) translate(-100px, 0)' : 'none',
              transition: 'transform 0.78s cubic-bezier(0.33, 1, 0.64, 1)',
            }}
          >
            {facingBoard ? (
              <g>
                {/* Rear ear modules */}
                <circle cx="38" cy="78" r="19" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="0.9" />
                <circle cx="162" cy="78" r="19" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="0.9" />
                <ellipse cx="100" cy="78" rx="56" ry="52" fill="url(#ch-white)" stroke="#c4c4cc" strokeWidth="1" />
                <ellipse cx="100" cy="78" rx="48" ry="44" fill="none" stroke="#a1a1aa" strokeWidth="0.5" opacity="0.45" />
                {/* Maintenance hatch — no visor / eyes */}
                <rect x="54" y="56" width="92" height="48" rx="16" fill="#d4d4d8" stroke="#9ca3af" strokeWidth="0.85" />
                <line x1="60" y1="80" x2="140" y2="80" stroke="#a1a1aa" strokeWidth="1" opacity="0.85" />
                <circle cx="72" cy="72" r="3.5" fill="#71717a" stroke="#52525b" strokeWidth="0.35" />
                <circle cx="128" cy="72" r="3.5" fill="#71717a" stroke="#52525b" strokeWidth="0.35" />
                <circle cx="72" cy="88" r="3.5" fill="#71717a" stroke="#52525b" strokeWidth="0.35" />
                <circle cx="128" cy="88" r="3.5" fill="#71717a" stroke="#52525b" strokeWidth="0.35" />
                <path d="M 100 40 L 100 112" stroke="#b4b4bc" strokeWidth="1.2" opacity="0.5" />
                <rect x="86" y="44" width="28" height="9" rx="2" fill="#27272a" opacity="0.4" />
                <line x1="90" y1="48" x2="110" y2="48" stroke="#22d3ee" strokeWidth="0.8" opacity="0.35" />
                <line x1="90" y1="51" x2="110" y2="51" stroke="#22d3ee" strokeWidth="0.8" opacity="0.35" />
                <line x1="88" y1="32" x2="84" y2="12" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
                <circle cx="84" cy="10" r="3.5" fill="#71717a" />
                <line x1="112" y1="32" x2="116" y2="12" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
                <circle cx="116" cy="10" r="3.5" fill="#71717a" />
              </g>
            ) : (
              <g>
                <ellipse cx="100" cy="78" rx="56" ry="52" fill="url(#ch-white)" stroke="#e4e4e7" strokeWidth="1" />
                <ellipse cx="92" cy="68" rx="22" ry="28" fill="rgba(255,255,255,0.5)" />

                <circle cx="38" cy="78" r="20" fill="url(#ch-white)" stroke="#d4d4d8" strokeWidth="0.8" />
                <circle cx="38" cy="78" r="12" fill="none" stroke="#22d3ee" strokeWidth="2.8" filter="url(#ch-cyan-glow)" opacity="0.9" />
                <circle cx="162" cy="78" r="20" fill="url(#ch-white)" stroke="#d4d4d8" strokeWidth="0.8" />
                <circle cx="162" cy="78" r="12" fill="none" stroke="#22d3ee" strokeWidth="2.8" filter="url(#ch-cyan-glow)" opacity="0.9" />

                <line x1="88" y1="32" x2="82" y2="10" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
                <circle cx="82" cy="8" r="4" fill="#22d3ee" filter="url(#ch-cyan-glow)" />
                <line x1="112" y1="32" x2="118" y2="10" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
                <circle cx="118" cy="8" r="4" fill="#22d3ee" filter="url(#ch-cyan-glow)" />

                <rect x="48" y="52" width="104" height="48" rx="20" fill="#0a0a0b" stroke="#27272a" strokeWidth="1" />
                <rect x="52" y="56" width="96" height="40" rx="16" fill="#18181b" opacity="0.85" />
                <line x1="52" y1="68" x2="148" y2="68" stroke="rgba(34,211,238,0.08)" strokeWidth="6" />

                <ellipse cx="78" cy="74" rx="16" ry="11" fill="#22d3ee" opacity="0.95" filter="url(#ch-cyan-glow)" />
                <ellipse cx="122" cy="74" rx="16" ry="11" fill="#22d3ee" opacity="0.95" filter="url(#ch-cyan-glow)" />
                <ellipse cx="80" cy="72" rx="6" ry="4" fill="#ecfeff" opacity="0.5" />
                <ellipse cx="124" cy="72" rx="6" ry="4" fill="#ecfeff" opacity="0.5" />

                <path
                  d="M 82 92 Q 100 108 118 92"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  filter="url(#ch-cyan-glow)"
                />
              </g>
            )}
          </g>

          {/* Right arm + chalk — swings up toward the board, then scribbles while writing */}
          <g transform="translate(138, 158)">
            <g
              style={{
                transformOrigin: '0px 0px',
                transform: armRaised ? 'rotate(-136deg)' : 'rotate(0deg)',
                transition: 'transform 0.72s cubic-bezier(0.33, 1, 0.55, 1)',
              }}
            >
              <g className={scribble ? 'robot-chalk-arm' : ''} style={{ transformOrigin: '0px 0px' }}>
                <circle cx="0" cy="0" r="10" fill="url(#ch-silver)" stroke="#52525b" strokeWidth="0.35" />
                <path
                  d="M -6 2 L -4 46 Q -4 54 2 56 L 10 56 Q 16 54 16 46 L 14 2 Q 12 -2 4 -2 Q -4 -2 -6 2 Z"
                  fill="url(#ch-white)"
                  stroke="#e4e4e7"
                  strokeWidth="0.6"
                />
                <circle cx="8" cy="32" r="6" fill="url(#ch-silver)" stroke="#52525b" strokeWidth="0.35" />
                <circle cx="8" cy="32" r="2.5" fill="#22d3ee" opacity="0.4" />
                <rect x="-2" y="52" width="16" height="12" rx="5" fill="#27272a" />
                <g transform="translate(6, 58) rotate(-12)">
                  <rect x="-2" y="0" width="5" height="22" rx="1.5" fill="url(#ch-chalk)" stroke="#a1a1aa" strokeWidth="0.35" />
                  <rect x="-1.5" y="18" width="2" height="5" rx="0.5" fill="#fef3c7" opacity="0.95" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export default function RobotScene({ isExplaining }: RobotSceneProps) {
  const [phase, setPhase] = useState<RobotTeachPhase>('greet');
  const [mainLine1, setMainLine1] = useState('');
  const [mainLine2, setMainLine2] = useState('');
  const typeTimerRef = useRef<number>(0);
  const idleNavTimerRef = useRef<number>(0);
  const phaseTimerRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'greet') return;
    setMainLine1('');
    setMainLine2('');
    idleNavTimerRef.current = window.setTimeout(() => setPhase('turnBoard'), 2800);
    return () => window.clearTimeout(idleNavTimerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'turnBoard') return;
    phaseTimerRef.current = window.setTimeout(() => setPhase('armUp'), 820);
    return () => window.clearTimeout(phaseTimerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'armUp') return;
    phaseTimerRef.current = window.setTimeout(() => setPhase('writing'), 780);
    return () => window.clearTimeout(phaseTimerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'turnViewer') return;
    phaseTimerRef.current = window.setTimeout(() => setPhase('greet'), 920);
    return () => window.clearTimeout(phaseTimerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'writing') return;
    setMainLine1('');
    setMainLine2('');
    let cancelled = false;
    let i = 0;
    let j = 0;

    const tick = () => {
      if (cancelled) return;
      if (i < MAIN_LINE1.length) {
        i++;
        setMainLine1(MAIN_LINE1.slice(0, i));
        typeTimerRef.current = window.setTimeout(tick, 52 + Math.random() * 28);
      } else if (j < MAIN_LINE2.length) {
        j++;
        setMainLine2(MAIN_LINE2.slice(0, j));
        typeTimerRef.current = window.setTimeout(tick, 52 + Math.random() * 28);
      } else {
        typeTimerRef.current = window.setTimeout(() => {
          if (!cancelled) setPhase('turnViewer');
        }, 1600);
      }
    };
    typeTimerRef.current = window.setTimeout(tick, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(typeTimerRef.current);
    };
  }, [phase]);

  const showBubble = phase === 'greet';
  const showCaret = phase === 'writing';
  const teachingMotion =
    phase === 'turnBoard' || phase === 'armUp' || phase === 'writing' || phase === 'turnViewer';

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #eef1f5 0%, #e4e9ef 12%, #dce3ea 22%, #d2d8e0 100%)',
      }}
    >
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: '18%',
          background: 'linear-gradient(180deg, #f8fafc 0%, #e8edf3 100%)',
          borderBottom: '3px solid rgba(148,163,184,0.35)',
        }}
      />
      <div className="absolute left-[8%] top-[5%] h-[6%] w-[28%] rounded-sm bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
      <div className="absolute left-[40%] top-[5%] h-[6%] w-[32%] rounded-sm bg-white/90 shadow-[0_0_24px_rgba(255,255,255,0.85)]" />
      <div className="absolute right-[8%] top-[5%] h-[6%] w-[26%] rounded-sm bg-white/85 shadow-[0_0_18px_rgba(255,255,255,0.8)]" />

      <div
        className="absolute bottom-0 right-0 top-[18%] w-[18%]"
        style={{
          background: 'linear-gradient(90deg, rgba(180,190,200,0.12) 0%, #c5ccd6 100%)',
          boxShadow: 'inset 8px 0 24px rgba(0,0,0,0.06)',
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-[14%] top-[18%]"
        style={{
          background: 'linear-gradient(180deg, #f4f2ee 0%, #ebe6df 55%, #e5dfd6 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[22%] left-0 right-[14%] top-[18%] opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'w\'%3E%3CfeTurbulence baseFrequency=\'0.4\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'60\' height=\'60\' filter=\'url(%23w)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
        }}
      />

      <div
        className="absolute left-0 right-[14%] z-[1]"
        style={{
          top: '72%',
          height: '10px',
          background: 'linear-gradient(180deg, #8b7355 0%, #5c4a36 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      />

      <div
        className="pointer-events-none absolute z-[1] rounded border-2 border-amber-900/20 bg-amber-50/40 shadow-sm"
        style={{ right: '18%', top: '38%', width: '12%', aspectRatio: '3/4' }}
      />
      <div
        className="pointer-events-none absolute z-[1] rounded border-2 border-amber-900/15 bg-sky-50/30 shadow-sm"
        style={{ right: '32%', top: '42%', width: '10%', aspectRatio: '4/3' }}
      />

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '22%',
          background: 'linear-gradient(180deg, #c9b89a 0%, #a8987c 45%, #8f7f66 100%)',
          transformOrigin: '50% 0%',
          transform: 'perspective(400px) rotateX(2deg)',
          boxShadow: 'inset 0 8px 24px rgba(0,0,0,0.12)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 opacity-25"
        style={{
          height: '22%',
          background:
            'repeating-linear-gradient(90deg, transparent 0px, transparent 48px, rgba(0,0,0,0.06) 48px, rgba(0,0,0,0.06) 50px)',
        }}
      />

      {/* Board fully visible; robot pulled up so raised arm meets the lower board / text band */}
      <div className="absolute inset-0 z-[2] flex flex-col items-center justify-end overflow-visible pb-[10%] pt-[4%] md:pb-[12%]">
        <div className="relative flex w-full max-w-[min(82vw,440px)] flex-col items-center overflow-visible px-2">
          <div className="relative z-[2] flex w-full shrink-0 justify-center">
            <GreenBoard mainLine1={mainLine1} mainLine2={mainLine2} showCaret={showCaret} />
          </div>

          <div
            className="relative z-[5] flex w-full justify-center overflow-visible"
            style={{
              /* Pull robot up so head sits near the board’s vertical center; chalk reaches text band */
              marginTop: 'clamp(-148px, -21vw, -100px)',
              transform:
                teachingMotion && phase !== 'turnViewer'
                  ? 'translateY(-5.5%) translateX(0) scale(1.12)'
                  : 'translateY(-2.5%) translateX(0) scale(1.08)',
              transformOrigin: '50% 0%',
              transition: 'transform 0.75s cubic-bezier(0.33, 1, 0.64, 1)',
            }}
          >
            <div className={phase === 'greet' ? 'robot-breathe-wrap' : ''}>
              <div className="relative inline-block overflow-visible">
                {showBubble && (
                  <div
                    className="absolute -right-1 bottom-[88%] z-10 w-max max-w-[min(200px,52vw)] rounded-2xl border-2 border-sky-700/30 bg-white/95 px-3 py-2 shadow-lg md:bottom-[92%] md:-right-2"
                    style={{
                      fontFamily: '"Patrick Hand", "Comic Neue", cursive',
                      fontSize: 'clamp(1rem, 2.8vw, 1.25rem)',
                      color: '#0c4a6e',
                      lineHeight: 1.25,
                    }}
                  >
                    Hello baccho!!
                    <div
                      className="absolute -bottom-2 left-6 h-3 w-3 rotate-45 border-b-2 border-r-2 border-sky-700/25 bg-white/95"
                      aria-hidden
                    />
                  </div>
                )}
                <RobotSVG phase={phase} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-[14%] left-[18%] right-[10%] z-[2] h-14 rounded-[100%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.16) 0%, transparent 72%)',
        }}
      />

      <div className="absolute bottom-3 left-0 right-0 z-[4] flex justify-center gap-3">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-500 ${isExplaining ? 'opacity-100' : 'opacity-70'}`}
          style={{
            background: 'rgba(45, 90, 61, 0.92)',
            border: `1px solid ${isExplaining ? 'rgba(134,239,172,0.5)' : 'rgba(0,0,0,0.08)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="rounded-full animate-indicator"
            style={{
              width: 7,
              height: 7,
              background: isExplaining ? '#22c55e' : '#94a3b8',
              boxShadow: isExplaining ? '0 0 8px #22c55e' : 'none',
              transition: 'all 0.5s ease',
            }}
          />
          <span
            style={{
              color: isExplaining ? '#bbf7d0' : '#e2e8f0',
              fontSize: '10px',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            {phase === 'writing' || isExplaining ? 'TEACHING' : 'READY'}
          </span>
        </div>
      </div>

      <div className="absolute left-4 right-4 top-3 z-[4] flex items-center justify-between">
        <span style={{ color: '#4a6b58', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', opacity: 0.55 }}>
          CLASSROOM
        </span>
        <div className="flex items-center gap-1.5">
          {[0, 0.35, 0.7].map((d, i) => (
            <div
              key={i}
              className="animate-indicator rounded-full"
              style={{ width: 4, height: 4, background: '#3d6b4f', animationDelay: `${d}s`, opacity: 0.45 }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes chalk-caret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes robot-breathe-move {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .robot-breathe-wrap {
          animation: robot-breathe-move 3.6s ease-in-out infinite;
        }
        @keyframes robot-chalk-arm {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          25% { transform: rotate(-5deg) translateX(-3px); }
          50% { transform: rotate(4deg) translateX(2px); }
          75% { transform: rotate(-3deg) translateX(-2px); }
        }
        .robot-chalk-arm {
          animation: robot-chalk-arm 0.45s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
