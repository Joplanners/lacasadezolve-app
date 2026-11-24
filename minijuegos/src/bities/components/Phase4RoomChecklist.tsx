import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { loadAsset, type LoadedAsset } from '../game/assets';
import { soundEngine } from '../game/sound';
import {
  drawCollectibleItem,
  drawCoverBackground,
  drawPlayerChibi,
} from '../game/sprites';
import type { ChecklistItemDef, ChecklistItemId, PlayerProfile } from '../game/types';

interface Phase4RoomChecklistProps {
  profile: PlayerProfile;
  onComplete: () => void;
}

const TIME_LIMIT_SECONDS = 20;

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: 'lightstick',
    shortLabel: 'Lightstick',
    fullLabel: 'Army Bomb / Lightstick',
    assetKey: 'item-lightstick',
    emoji: '🔮',
    accentColor: '#8b5cf6',
    x: 0.22,
    y: 0.31,
  },
  {
    id: 'tshirt',
    shortLabel: 'Polera',
    fullLabel: 'Polera del concierto',
    assetKey: 'item-tshirt',
    emoji: '👕',
    accentColor: '#7c3aed',
    x: 0.78,
    y: 0.31,
  },
  {
    id: 'powerbank',
    shortLabel: 'Cargador',
    fullLabel: 'Cargador portátil',
    assetKey: 'item-powerbank',
    emoji: '🔋',
    accentColor: '#328990',
    x: 0.22,
    y: 0.8,
  },
  {
    id: 'bandana',
    shortLabel: 'Bandana',
    fullLabel: 'Bandana morada',
    assetKey: 'item-bandana',
    emoji: '🎀',
    accentColor: '#e85d24',
    x: 0.78,
    y: 0.8,
  },
];

interface DecoyItemDef {
  id: 'decoy-pan' | 'decoy-remote';
  label: string;
  warning: string;
  x: number;
  y: number;
}

const DECOY_ITEMS: DecoyItemDef[] = [
  {
    id: 'decoy-pan',
    label: 'Sartén',
    warning: '¡Ups! ¿Una sartén? ¡Eso no es para el concierto! (-2s)',
    x: 0.22,
    y: 0.56,
  },
  {
    id: 'decoy-remote',
    label: 'Control TV',
    warning: '¡Ups! ¡El control de la tele no va al estadio! (-2s)',
    x: 0.78,
    y: 0.56,
  },
];

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface FloatingNotice {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export function Phase4RoomChecklist({ profile, onComplete }: Phase4RoomChecklistProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);
  const [collectedIds, setCollectedIds] = useState<ChecklistItemId[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
  const [ticketAppeared, setTicketAppeared] = useState(false);
  const [decoyBanner, setDecoyBanner] = useState<string | null>(null);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [purpleFlash, setPurpleFlash] = useState(false);

  const collectedRef = useRef<Set<ChecklistItemId>>(new Set());
  const triggeredDecoysRef = useRef<Set<string>>(new Set());
  const ticketUnlockedRef = useRef(false);
  const endedRef = useRef(false);
  const decoyBannerTimer = useRef<number | null>(null);

  const dpadHeld = useRef({ up: false, down: false, left: false, right: false });
  const walkTarget = useRef<{ x: number; y: number } | null>(null);
  const rippleRef = useRef<{ x: number; y: number; life: number } | null>(null);

  useEffect(() => {
    soundEngine.setTrack('mission');
  }, []);

  // 20-second countdown timer
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          endedRef.current = true;
          setStatus('lost');
          soundEngine.playMissionFail();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status, attemptKey]);

  // Keyboard WASD / Arrow controls
  useEffect(() => {
    const setKey = (key: string, val: boolean) => {
      if (key === 'ArrowUp' || key === 'w' || key === 'W') dpadHeld.current.up = val;
      if (key === 'ArrowDown' || key === 's' || key === 'S') dpadHeld.current.down = val;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') dpadHeld.current.left = val;
      if (key === 'ArrowRight' || key === 'd' || key === 'D') dpadHeld.current.right = val;
    };
    const onDown = (e: KeyboardEvent) => {
      setKey(e.key, true);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        walkTarget.current = null;
      }
    };
    const onUp = (e: KeyboardEvent) => setKey(e.key, false);
    const onBlur = () => {
      dpadHeld.current = { up: false, down: false, left: false, right: false };
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Isolated 60fps Room Exploration Canvas Loop (resets cleanly on attemptKey)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    collectedRef.current = new Set();
    triggeredDecoysRef.current = new Set();
    ticketUnlockedRef.current = false;
    endedRef.current = false;
    walkTarget.current = null;
    rippleRef.current = null;
    setCollectedIds([]);
    setTimeLeft(TIME_LIMIT_SECONDS);
    setTicketAppeared(false);
    setDecoyBanner(null);
    setStatus('playing');
    setPurpleFlash(false);

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let shakeTimer = 0;

    const assets: Partial<Record<string, LoadedAsset>> = {};
    Promise.all([
      loadAsset('bg-room'),
      loadAsset(profile.avatar === 'girl' ? 'avatar-girl' : 'avatar-boy'),
      loadAsset('item-lightstick'),
      loadAsset('item-tshirt'),
      loadAsset('item-powerbank'),
      loadAsset('item-bandana'),
      loadAsset('item-ticket'),
    ]).then(([bg, avatar, lightstick, tshirt, powerbank, bandana, ticket]) => {
      assets.bg = bg;
      assets.avatar = avatar;
      assets.lightstick = lightstick;
      assets.tshirt = tshirt;
      assets.powerbank = powerbank;
      assets.bandana = bandana;
      assets.ticket = ticket;
    });

    let playerX = 0.5;
    let playerY = 0.56;
    const sparkles: Sparkle[] = [];
    const notices: FloatingNotice[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnBurst = (x: number, y: number, color: string, count = 14) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const sp = 45 + Math.random() * 80;
        sparkles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          color,
          size: 3 + Math.random() * 3.5,
          life: 0.7,
        });
      }
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      elapsed += dt;
      if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt);

      const w = canvas.clientWidth || 360;
      const h = canvas.clientHeight || 420;

      let walking = false;
      if (!endedRef.current) {
        let vx = 0;
        let vy = 0;
        if (dpadHeld.current.left) vx -= 1;
        if (dpadHeld.current.right) vx += 1;
        if (dpadHeld.current.up) vy -= 1;
        if (dpadHeld.current.down) vy += 1;

        const speedPx = 200;

        if (vx !== 0 || vy !== 0) {
          walkTarget.current = null;
          const mag = Math.hypot(vx, vy);
          playerX += ((vx / mag) * speedPx * dt) / w;
          playerY += ((vy / mag) * speedPx * dt) / h;
          walking = true;
        } else if (walkTarget.current) {
          const tx = walkTarget.current.x * w;
          const ty = walkTarget.current.y * h;
          const px = playerX * w;
          const py = playerY * h;
          const dx = tx - px;
          const dy = ty - py;
          const dist = Math.hypot(dx, dy);
          if (dist > 6) {
            const step = Math.min(dist, speedPx * dt);
            playerX = (px + (dx / dist) * step) / w;
            playerY = (py + (dy / dist) * step) / h;
            walking = true;
          } else {
            walkTarget.current = null;
          }
        }

        playerX = Math.max(0.14, Math.min(0.86, playerX));
        playerY = Math.max(0.22, Math.min(0.88, playerY));

        const px = playerX * w;
        const py = playerY * h;

        // 1. Check collision with the 4 real concert items
        for (const item of CHECKLIST_ITEMS) {
          if (collectedRef.current.has(item.id)) continue;
          const ix = item.x * w;
          const iy = item.y * h;
          if (Math.hypot(px - ix, py - iy) < 42) {
            collectedRef.current.add(item.id);
            const nextList = Array.from(collectedRef.current);
            setCollectedIds(nextList);
            soundEngine.playPickup();
            spawnBurst(ix, iy, '#fde047', 16);
            notices.push({
              x: ix,
              y: iy - 22,
              text: `¡${item.shortLabel} listo!`,
              color: '#fde047',
              life: 1.0,
            });

            if (nextList.length === CHECKLIST_ITEMS.length && !ticketUnlockedRef.current) {
              ticketUnlockedRef.current = true;
              setTicketAppeared(true);
              soundEngine.playGoldenTicket();
              spawnBurst(w * 0.5, h * 0.54, '#fde047', 24);
            }
          }
        }

        // 2. Check collision with funny Decoy Items ("¡Eso no es para el concierto!")
        for (const decoy of DECOY_ITEMS) {
          if (triggeredDecoysRef.current.has(decoy.id)) continue;
          const dx = decoy.x * w;
          const dy = decoy.y * h;
          if (Math.hypot(px - dx, py - dy) < 38) {
            triggeredDecoysRef.current.add(decoy.id);
            soundEngine.playBump();
            shakeTimer = 0.25;
            spawnBurst(dx, dy, '#fb7185', 14);
            notices.push({
              x: dx,
              y: dy - 22,
              text: '¡Eso no va! -2s',
              color: '#fda4af',
              life: 1.2,
            });

            // Show clear funny warning banner & apply gentle -2s penalty
            setDecoyBanner(decoy.warning);
            if (decoyBannerTimer.current) {
              window.clearTimeout(decoyBannerTimer.current);
            }
            decoyBannerTimer.current = window.setTimeout(() => {
              setDecoyBanner(null);
            }, 2400);

            setTimeLeft((prev) => {
              const next = Math.max(0, prev - 2);
              if (next === 0 && !endedRef.current) {
                endedRef.current = true;
                setStatus('lost');
                soundEngine.playMissionFail();
              }
              return next;
            });
          }
        }

        // 3. Check pickup of the 5th Golden Item: La Entrada
        if (ticketUnlockedRef.current) {
          const tx = w * 0.5;
          const ty = h * 0.54;
          if (Math.hypot(px - tx, py - ty) < 44) {
            endedRef.current = true;
            setStatus('won');
            soundEngine.playGoldenTicket();
            spawnBurst(tx, ty, '#e9d5ff', 28);
            setPurpleFlash(true);
            window.setTimeout(() => {
              onComplete();
            }, 850);
          }
        }
      }

      if (rippleRef.current) {
        rippleRef.current.life -= dt;
        if (rippleRef.current.life <= 0) rippleRef.current = null;
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        sparkles[i].x += sparkles[i].vx * dt;
        sparkles[i].y += sparkles[i].vy * dt;
        sparkles[i].life -= dt;
        if (sparkles[i].life <= 0) sparkles.splice(i, 1);
      }
      for (let i = notices.length - 1; i >= 0; i--) {
        notices[i].y -= 32 * dt;
        notices[i].life -= dt;
        if (notices[i].life <= 0) notices.splice(i, 1);
      }

      // --- RENDER ---
      ctx.save();
      if (shakeTimer > 0) {
        const mag = shakeTimer * 16;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      const drewBg = drawCoverBackground(ctx, assets.bg, w, h);
      if (!drewBg) {
        ctx.fillStyle = '#34195e';
        ctx.fillRect(0, 0, w, h);
      }

      const vig = ctx.createRadialGradient(w * 0.5, h * 0.55, w * 0.22, w * 0.5, h * 0.55, w * 0.85);
      vig.addColorStop(0, 'rgba(20, 8, 42, 0.04)');
      vig.addColorStop(1, 'rgba(20, 8, 42, 0.34)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      if (rippleRef.current) {
        const r = rippleRef.current;
        const prog = 1 - r.life / 0.55;
        ctx.save();
        ctx.strokeStyle = `rgba(70, 168, 176, ${1 - prog})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x * w, r.y * h, 10 + prog * 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw remaining 4 survival items
      for (const item of CHECKLIST_ITEMS) {
        if (collectedRef.current.has(item.id)) continue;
        drawCollectibleItem(
          ctx,
          item.x * w,
          item.y * h,
          item.id,
          item.shortLabel,
          elapsed,
          assets[item.id]
        );
      }

      // Draw funny decoy items (blending into the room to test attention!)
      for (const decoy of DECOY_ITEMS) {
        if (triggeredDecoysRef.current.has(decoy.id)) continue;
        drawCollectibleItem(
          ctx,
          decoy.x * w,
          decoy.y * h,
          decoy.id,
          decoy.label,
          elapsed
        );
      }

      // Draw 5th Golden Item: La Entrada in center
      if (ticketUnlockedRef.current && !endedRef.current) {
        const tx = w * 0.5;
        const ty = h * 0.54;

        ctx.save();
        const beam = ctx.createLinearGradient(tx, 0, tx, ty + 40);
        beam.addColorStop(0, 'rgba(254, 240, 138, 0.06)');
        beam.addColorStop(0.65, 'rgba(254, 240, 138, 0.38)');
        beam.addColorStop(1, 'rgba(245, 158, 11, 0.05)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(tx - 26, 0);
        ctx.lineTo(tx + 26, 0);
        ctx.lineTo(tx + 54, ty + 28);
        ctx.lineTo(tx - 54, ty + 28);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        drawCollectibleItem(ctx, tx, ty, 'ticket', 'La Entrada', elapsed, assets.ticket);
      }

      drawPlayerChibi(ctx, playerX * w, playerY * h, profile.avatar, {
        scale: 1.05,
        time: elapsed,
        walking,
        wearsHeadband: true,
        hasLightstick: collectedRef.current.has('lightstick'),
        avatarAsset: assets.avatar,
      });

      for (const s of sparkles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life * 1.4);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const n of notices) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, n.life * 1.5);
        ctx.font = '800 14px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#1b0b38';
        ctx.lineWidth = 4;
        ctx.strokeText(n.text, n.x, n.y);
        ctx.fillStyle = n.color;
        ctx.fillText(n.text, n.x, n.y);
        ctx.restore();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      if (decoyBannerTimer.current) {
        window.clearTimeout(decoyBannerTimer.current);
      }
    };
  }, [profile.avatar, onComplete, attemptKey]);

  const handleCanvasTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status !== 'playing') return;
    soundEngine.unlock();
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0.14, Math.min(0.86, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const ny = Math.max(0.22, Math.min(0.88, (e.clientY - rect.top) / Math.max(1, rect.height)));
    walkTarget.current = { x: nx, y: ny };
    rippleRef.current = { x: nx, y: ny, life: 0.55 };
  };

  const bindDir = (dir: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: () => {
      if (status !== 'playing') return;
      soundEngine.unlock();
      walkTarget.current = null;
      dpadHeld.current[dir] = true;
    },
    onPointerUp: () => {
      dpadHeld.current[dir] = false;
    },
    onPointerLeave: () => {
      dpadHeld.current[dir] = false;
    },
    onPointerCancel: () => {
      dpadHeld.current[dir] = false;
    },
  });

  const handleRetry = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    setAttemptKey((k) => k + 1);
  };

  const lowTime = timeLeft <= 6 && status === 'playing';

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1b0b38] overflow-hidden">
      {/* Top Visual Checklist HUD + 20s Timer */}
      <div className="relative z-20 shrink-0 px-3.5 pt-14 pb-2.5 bg-[#1b0b38]/95 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-semibold text-[#c4b5fd]">
              Misión 3 · Checklist de Supervivencia
            </p>
            <p className="text-xs sm:text-sm font-bold text-white leading-tight">
              {ticketAppeared
                ? '¡Recoge La Entrada dorada en el centro!'
                : 'Recoge solo los 4 objetos del concierto'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`flex items-center gap-1 font-mono-num font-bold text-base ${
                lowTime ? 'text-[#fb923c]' : 'text-[#99f6e4]'
              }`}
              aria-label={`Tiempo restante: ${timeLeft} segundos`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{timeLeft}s</span>
            </div>

            <span className="font-mono-num font-bold text-base text-[#fde047]">
              {collectedIds.length}/4
            </span>
          </div>
        </div>

        {/* 4-Item Checklist Grid with Green Checkmarks */}
        <div className="grid grid-cols-4 gap-1.5">
          {CHECKLIST_ITEMS.map((item) => {
            const done = collectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`rounded-xl px-1.5 py-1.5 flex flex-col items-center justify-center text-center border transition-colors duration-200 ${
                  done
                    ? 'bg-[#065f46]/85 border-[#34d399] text-white'
                    : 'bg-[#2a1257]/80 border-white/15 text-[#e9d5ff]'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base leading-none" aria-hidden="true">
                    {item.emoji}
                  </span>
                  {done && (
                    <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold leading-tight mt-0.5 truncate w-full">
                  {item.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Isolated 60fps Room Exploration Canvas */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasTap}
          className="w-full h-full block touch-none cursor-pointer"
        />

        {/* Funny Decoy Item Feedback Banner */}
        {decoyBanner && status === 'playing' && (
          <div className="pointer-events-none absolute top-3 inset-x-3 z-20 flex justify-center">
            <div className="animate-pop-in bg-[#991b1b] text-white px-4 py-2 rounded-xl border-2 border-[#fca5a5] shadow-xl text-center">
              <span className="font-display font-bold text-sm leading-snug block">
                {decoyBanner}
              </span>
            </div>
          </div>
        )}

        {/* Golden Ticket Banner (when no decoy warning is active) */}
        {ticketAppeared && !decoyBanner && !purpleFlash && status === 'playing' && (
          <div className="pointer-events-none absolute top-3 inset-x-4 z-20 flex justify-center">
            <div className="animate-pop-in bg-[#fffbeb] text-[#92400e] px-4 py-1.5 rounded-xl border-2 border-[#f59e0b] shadow-lg text-center">
              <span className="font-display font-bold text-sm">
                ✨ ¡Recoge La Entrada dorada en el centro!
              </span>
            </div>
          </div>
        )}

        {/* Timeout Lose / Retry Modal */}
        {status === 'lost' && (
          <div className="absolute inset-0 z-30 bg-[#140729]/86 flex items-center justify-center p-5">
            <div className="animate-pop-in w-full max-w-[350px] bg-[#fffaf3] text-[#1c0c38] rounded-3xl p-5 border-4 border-[#e85d24] shadow-2xl flex flex-col items-center text-center gap-3">
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#e85d24]">
                ¡Se cerraron las puertas!
              </p>
              <h3 className="font-display font-bold text-2xl leading-snug text-[#1c0c38]">
                ¡No alcanzaste a llegar al concierto!
              </h3>
              <p className="text-sm font-medium text-[#4a396b]">
                El tiempo se terminó antes de tomar tu entrada. Evita los objetos de mentira y ¡vamos otra vez!
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="w-full min-h-[54px] mt-1 px-5 py-3 rounded-2xl bg-[#e85d24] hover:bg-[#f26b34] active:scale-[0.98] text-white font-display font-bold text-lg border-b-4 border-[#b24113] shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Reintentar Misión 3</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accessible Compact Touch Cruceta (D-pad) with shrink-0 & >= 48px targets */}
      <div className="relative z-20 shrink-0 px-4 py-2.5 bg-[#1b0b38] border-t border-white/10 flex items-center justify-between gap-3">
        <p className="text-xs text-[#d8c7f5] leading-snug max-w-[148px]">
          Toca en la habitación o usa la cruceta. ¡Ojo con los objetos trampa!
        </p>

        <div className="grid grid-cols-3 gap-1.5 items-center">
          <div />
          <button
            type="button"
            aria-label="Caminar arriba"
            {...bindDir('up')}
            className="w-12 h-12 rounded-xl bg-[#328990] active:bg-[#46a8b0] active:scale-95 text-white flex items-center justify-center border-b-2 border-[#1f595e] shadow cursor-pointer"
          >
            <ArrowUp className="w-6 h-6 stroke-[2.6]" />
          </button>
          <div />

          <button
            type="button"
            aria-label="Caminar izquierda"
            {...bindDir('left')}
            className="w-12 h-12 rounded-xl bg-[#328990] active:bg-[#46a8b0] active:scale-95 text-white flex items-center justify-center border-b-2 border-[#1f595e] shadow cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.6]" />
          </button>
          <button
            type="button"
            aria-label="Caminar abajo"
            {...bindDir('down')}
            className="w-12 h-12 rounded-xl bg-[#328990] active:bg-[#46a8b0] active:scale-95 text-white flex items-center justify-center border-b-2 border-[#1f595e] shadow cursor-pointer"
          >
            <ArrowDown className="w-6 h-6 stroke-[2.6]" />
          </button>
          <button
            type="button"
            aria-label="Caminar derecha"
            {...bindDir('right')}
            className="w-12 h-12 rounded-xl bg-[#328990] active:bg-[#46a8b0] active:scale-95 text-white flex items-center justify-center border-b-2 border-[#1f595e] shadow cursor-pointer"
          >
            <ArrowRight className="w-6 h-6 stroke-[2.6]" />
          </button>
        </div>
      </div>

      {/* Magical Purple Flash Transition Overlay */}
      {purpleFlash && (
        <div
          className="animate-purple-flash absolute inset-0 z-50 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, #ffffff 0%, #c084fc 45%, #6d28d9 100%)',
          }}
        />
      )}
    </div>
  );
}
