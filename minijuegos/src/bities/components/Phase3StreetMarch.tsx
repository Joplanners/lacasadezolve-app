import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Newspaper, RotateCcw } from 'lucide-react';
import { loadAsset, type LoadedAsset } from '../game/assets';
import { soundEngine } from '../game/sound';
import {
  drawArmyFanNpc,
  drawCoverBackground,
  drawFakeNewsObstacle,
  drawPlayerChibi,
} from '../game/sprites';
import type { PlayerProfile } from '../game/types';

interface Phase3StreetMarchProps {
  profile: PlayerProfile;
  onComplete: (fansRecruited: number) => void;
}

interface StreetEntity {
  id: number;
  kind: 'fan' | 'fake';
  x: number; // normalized 0.24 .. 0.76
  y: number; // px from top
  variant: number;
  collected?: boolean;
  hit?: boolean;
}

interface PopText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

const GOAL_DISTANCE = 100;
const TOTAL_FANS_ON_STREET = 10;
const MIN_FANS_REQUIRED = 3;

// Deterministic, fair wave schedule: 10 ARMY fans + 8 slow Fake News obstacles (2+ extra vs before)
const STREET_SCHEDULE: Array<{ triggerDist: number; kind: 'fan' | 'fake'; lane: number }> = [
  { triggerDist: 4, kind: 'fan', lane: 0.5 },
  { triggerDist: 10, kind: 'fake', lane: 0.28 },
  { triggerDist: 15, kind: 'fan', lane: 0.72 },
  { triggerDist: 20, kind: 'fake', lane: 0.5 },
  { triggerDist: 25, kind: 'fan', lane: 0.28 },
  { triggerDist: 30, kind: 'fake', lane: 0.72 },
  { triggerDist: 35, kind: 'fan', lane: 0.5 },
  { triggerDist: 40, kind: 'fake', lane: 0.28 },
  { triggerDist: 45, kind: 'fan', lane: 0.72 },
  { triggerDist: 50, kind: 'fake', lane: 0.5 },
  { triggerDist: 55, kind: 'fan', lane: 0.28 },
  { triggerDist: 60, kind: 'fake', lane: 0.72 },
  { triggerDist: 64, kind: 'fan', lane: 0.5 },
  { triggerDist: 69, kind: 'fake', lane: 0.28 },
  { triggerDist: 73, kind: 'fan', lane: 0.72 },
  { triggerDist: 78, kind: 'fake', lane: 0.5 },
  { triggerDist: 82, kind: 'fan', lane: 0.28 },
  { triggerDist: 88, kind: 'fan', lane: 0.5 },
];

export function Phase3StreetMarch({ profile, onComplete }: Phase3StreetMarchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [fansCount, setFansCount] = useState(0);
  const [outcome, setOutcome] = useState<'playing' | 'won' | 'lost'>('playing');

  // Input refs (never trigger React re-renders inside game loop)
  const keysHeld = useRef({ left: false, right: false });
  const pointerTargetX = useRef<number | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    soundEngine.setTrack('mission');
  }, []);

  // Keyboard controls + window blur cleanup
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysHeld.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysHeld.current.right = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysHeld.current.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysHeld.current.right = false;
      }
    };
    const onBlur = () => {
      keysHeld.current.left = false;
      keysHeld.current.right = false;
      pointerTargetX.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Isolated 60fps Canvas Simulation Loop (restarts cleanly when attemptKey increments)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    finishedRef.current = false;
    setProgressPct(0);
    setFansCount(0);
    setOutcome('playing');

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;

    const assets: {
      bg?: LoadedAsset;
      avatar?: LoadedAsset;
      npc?: LoadedAsset;
      fake?: LoadedAsset;
    } = {};

    Promise.all([
      loadAsset('bg-street'),
      loadAsset(profile.avatar === 'girl' ? 'avatar-girl' : 'avatar-boy'),
      loadAsset('npc-army'),
      loadAsset('obstacle-fake'),
    ]).then(([bg, avatar, npc, fake]) => {
      assets.bg = bg;
      assets.avatar = avatar;
      assets.npc = npc;
      assets.fake = fake;
    });

    let playerX = 0.5;
    const trailX: number[] = Array(28).fill(0.5);
    let distance = 0;
    let recruited = 0;
    let hurtTimer = 0;
    let shakeTimer = 0;
    let roadScroll = 0;
    let scheduleIndex = 0;
    let lastHudSync = 0;

    const entities: StreetEntity[] = [];
    const pops: PopText[] = [];
    const sparkles: Sparkle[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnBurst = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 45 + Math.random() * 85;
        sparkles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          color,
          size: 3 + Math.random() * 3.5,
          life: 0.65,
        });
      }
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      elapsed += dt;

      const w = canvas.clientWidth || 360;
      const h = canvas.clientHeight || 520;
      const playerY = h * 0.68;

      if (!finishedRef.current) {
        const moveSpeed = 0.85;
        if (keysHeld.current.left) {
          playerX -= moveSpeed * dt;
          pointerTargetX.current = null;
        }
        if (keysHeld.current.right) {
          playerX += moveSpeed * dt;
          pointerTargetX.current = null;
        }
        if (pointerTargetX.current !== null) {
          const diff = pointerTargetX.current - playerX;
          playerX += Math.sign(diff) * Math.min(Math.abs(diff), moveSpeed * 1.45 * dt);
        }
        playerX = Math.max(0.22, Math.min(0.78, playerX));

        trailX.unshift(playerX);
        if (trailX.length > 48) trailX.pop();

        // Advance along the street (~21s march)
        const speedFactor = hurtTimer > 0 ? 0.65 : 1;
        distance = Math.min(GOAL_DISTANCE, distance + 4.7 * speedFactor * dt);
        roadScroll = (roadScroll + 138 * speedFactor * dt) % 64;

        if (hurtTimer > 0) hurtTimer = Math.max(0, hurtTimer - dt);
        if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt);

        // Spawn scheduled 10 ARMY fans + 8 Fake News obstacles
        while (
          scheduleIndex < STREET_SCHEDULE.length &&
          distance >= STREET_SCHEDULE[scheduleIndex].triggerDist
        ) {
          const item = STREET_SCHEDULE[scheduleIndex];
          entities.push({
            id: scheduleIndex + 1,
            kind: item.kind,
            x: item.lane,
            y: -36,
            variant: scheduleIndex + 1,
          });
          scheduleIndex += 1;
        }

        // Update entities & collisions
        const px = playerX * w;
        for (const ent of entities) {
          const fallSpeed = ent.kind === 'fake' ? 136 : 142;
          ent.y += fallSpeed * dt;

          const ex = ent.x * w;
          const dist = Math.hypot(px - ex, playerY - ent.y);

          if (ent.kind === 'fan' && !ent.collected && dist < 44) {
            ent.collected = true;
            recruited = Math.min(TOTAL_FANS_ON_STREET, recruited + 1);
            setFansCount(recruited);
            soundEngine.playRecruit();
            spawnBurst(ex, ent.y, '#c4b5fd', 12);
            pops.push({
              x: ex,
              y: ent.y - 16,
              text: '+1 ARMY!',
              color: '#fde047',
              life: 0.95,
            });
          } else if (ent.kind === 'fake' && !ent.hit && hurtTimer <= 0 && dist < 35) {
            ent.hit = true;
            hurtTimer = 1.0;
            shakeTimer = 0.28;
            soundEngine.playBump();
            spawnBurst(ex, ent.y, '#fb7185', 12);

            if (recruited > 0) {
              recruited -= 1;
              setFansCount(recruited);
              pops.push({
                x: px,
                y: playerY - 40,
                text: '-1 ARMY · ¡Fake News!',
                color: '#fda4af',
                life: 1.15,
              });
            } else {
              pops.push({
                x: px,
                y: playerY - 40,
                text: '¡Cuidado · Fake News!',
                color: '#fda4af',
                life: 1.1,
              });
            }
          }
        }

        for (let i = entities.length - 1; i >= 0; i--) {
          if (entities[i].y > h + 60 || entities[i].collected || entities[i].hit) {
            entities.splice(i, 1);
          }
        }

        if (elapsed - lastHudSync > 0.12 || distance >= GOAL_DISTANCE) {
          lastHudSync = elapsed;
          setProgressPct(Math.round(distance));
        }

        // Goal evaluation: must arrive with at least 3 ARMY fans!
        if (distance >= GOAL_DISTANCE) {
          finishedRef.current = true;
          setProgressPct(100);
          if (recruited >= MIN_FANS_REQUIRED) {
            setOutcome('won');
            soundEngine.playVictory();
            spawnBurst(w * 0.5, h * 0.45, '#fde047', 22);
            spawnBurst(w * 0.3, h * 0.5, '#c4b5fd', 16);
            spawnBurst(w * 0.7, h * 0.5, '#46a8b0', 16);
          } else {
            setOutcome('lost');
            soundEngine.playMissionFail();
          }
        }
      }

      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].y -= 36 * dt;
        pops[i].life -= dt;
        if (pops[i].life <= 0) pops.splice(i, 1);
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        sparkles[i].x += sparkles[i].vx * dt;
        sparkles[i].y += sparkles[i].vy * dt;
        sparkles[i].vy += 120 * dt;
        sparkles[i].life -= dt;
        if (sparkles[i].life <= 0) sparkles.splice(i, 1);
      }

      // --- RENDER ---
      ctx.save();
      if (shakeTimer > 0) {
        const mag = shakeTimer * 18;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      const drewBg = drawCoverBackground(ctx, assets.bg, w, h);
      if (!drewBg) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#4c1d95');
        grad.addColorStop(1, '#2a1257');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.save();
      ctx.fillStyle = 'rgba(255, 250, 243, 0.24)';
      const centerX = w * 0.5;
      for (let y = (roadScroll % 64) - 64; y < h; y += 64) {
        ctx.beginPath();
        ctx.roundRect(centerX - 3, y + 18, 6, 26, 3);
        ctx.fill();
      }
      ctx.restore();

      if (distance > 86) {
        const finishProgress = (distance - 86) / 14;
        const finishY = -30 + finishProgress * (playerY - 12);
        ctx.save();
        ctx.fillStyle = '#328990';
        ctx.fillRect(w * 0.16, finishY - 14, w * 0.68, 28);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.16, finishY - 14, w * 0.68, 28);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 13px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('META · ESTADIO CONFIRMADO', w * 0.5, finishY);
        ctx.restore();
      }

      for (const ent of entities) {
        const ex = ent.x * w;
        if (ent.kind === 'fan') {
          drawArmyFanNpc(ctx, ex, ent.y, elapsed, ent.variant, assets.npc, false);
        } else {
          drawFakeNewsObstacle(ctx, ex, ent.y, elapsed, assets.fake);
        }
      }

      const visibleSquad = Math.min(recruited, 6);
      for (let i = visibleSquad - 1; i >= 0; i--) {
        const row = Math.floor(i / 2) + 1;
        const side = i % 2 === 0 ? -1 : 1;
        const trailIdx = Math.min(trailX.length - 1, row * 10);
        const fx = trailX[trailIdx] * w + side * (22 + row * 4);
        const fy = playerY + 34 + row * 24;
        drawArmyFanNpc(ctx, fx, fy, elapsed, i + 1, assets.npc, true);
      }

      drawPlayerChibi(ctx, playerX * w, playerY, profile.avatar, {
        scale: 1.08,
        time: elapsed,
        walking: !finishedRef.current,
        wearsHeadband: true,
        hasLightstick: true,
        avatarAsset: assets.avatar,
        hurtFlash: hurtTimer,
        label: profile.name,
      });

      for (const s of sparkles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life * 1.5);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const p of pops) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.6);
        ctx.font = '800 14px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#1b0b38';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [profile.avatar, profile.name, attemptKey]);

  const updatePointerTarget = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = (clientX - rect.left) / Math.max(1, rect.width);
    pointerTargetX.current = Math.max(0.22, Math.min(0.78, normX));
  };

  const handleRetry = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    setAttemptKey((k) => k + 1);
  };

  const meetsGoal = fansCount >= MIN_FANS_REQUIRED;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1b0b38] overflow-hidden">
      {/* Compact Top HUD */}
      <div className="relative z-20 shrink-0 px-4 pt-14 pb-2.5 bg-[#1b0b38]/92 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div>
            <p className="text-xs font-semibold text-[#c4b5fd]">
              Misión 2 · La Movilización en la Calle
            </p>
            <p className="text-xs sm:text-sm font-bold text-white">
              Reúne al menos {MIN_FANS_REQUIRED} fans · Las Fake News restan 1
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-[#e9d5ff] block leading-none">
              Fans (mín. {MIN_FANS_REQUIRED})
            </span>
            <span
              className={`font-mono-num font-bold text-xl ${
                meetsGoal ? 'text-[#34d399]' : 'text-[#fde047]'
              }`}
            >
              {fansCount}/{TOTAL_FANS_ON_STREET}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-3 rounded-full bg-[#120626] border border-white/20 overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance hacia la meta"
          >
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #328990 0%, #e85d24 100%)',
              }}
            />
          </div>
          <span className="font-mono-num text-xs font-bold text-white w-10 text-right">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Isolated 60fps Street Canvas */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            soundEngine.unlock();
            e.currentTarget.setPointerCapture(e.pointerId);
            updatePointerTarget(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0 || e.pointerType === 'touch') {
              updatePointerTarget(e.clientX);
            }
          }}
          onPointerUp={() => {
            pointerTargetX.current = null;
          }}
          className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
        />

        {/* Win Modal: Celebratory Headline */}
        {outcome === 'won' && (
          <div className="absolute inset-0 z-30 bg-[#140729]/82 flex items-center justify-center p-5">
            <div className="animate-pop-in w-full max-w-[360px] bg-[#fffaf3] text-[#1c0c38] rounded-3xl p-5 border-4 border-[#e85d24] shadow-2xl flex flex-col items-center text-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#328990] text-white flex items-center justify-center shadow-md">
                <Newspaper className="w-8 h-8" />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#e85d24]">
                Edición Especial · Chile
              </p>
              <h3 className="font-display font-bold text-2xl leading-snug text-[#1c0c38] text-balance">
                ¡CONFIRMADO! El concierto en el Estadio SÍ se realiza
              </h3>
              <p className="text-sm font-medium text-[#4a396b]">
                Marchaste con <strong className="text-[#6d28d9]">{fansCount} fans ARMY</strong> y el sueño sigue más vivo que nunca.
              </p>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPickup();
                  onComplete(fansCount);
                }}
                className="w-full min-h-[54px] mt-1 px-5 py-3 rounded-2xl bg-[#e85d24] hover:bg-[#f26b34] active:scale-[0.98] text-white font-display font-bold text-lg border-b-4 border-[#b24113] shadow-lg transition-all cursor-pointer"
              >
                ¡Preparar mi mochila!
              </button>
            </div>
          </div>
        )}

        {/* Lose Modal: Did not reach at least 3 ARMY fans */}
        {outcome === 'lost' && (
          <div className="absolute inset-0 z-30 bg-[#140729]/85 flex items-center justify-center p-5">
            <div className="animate-pop-in w-full max-w-[360px] bg-[#fffaf3] text-[#1c0c38] rounded-3xl p-5 border-4 border-[#e85d24] shadow-2xl flex flex-col items-center text-center gap-3">
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#e85d24]">
                Faltó apoyo en la calle
              </p>
              <h3 className="font-display font-bold text-2xl leading-snug text-[#1c0c38] text-balance">
                ¡Ohhh no! No alcanzaste el objetivo
              </h3>
              <p className="text-sm font-medium text-[#4a396b]">
                Necesitabas llegar con al menos <strong className="text-[#6d28d9]">{MIN_FANS_REQUIRED} fans ARMY</strong> y llegaste con <strong>{fansCount}</strong>. ¡Esquiva las Fake News e inténtalo de nuevo!
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="w-full min-h-[54px] mt-1 px-5 py-3 rounded-2xl bg-[#e85d24] hover:bg-[#f26b34] active:scale-[0.98] text-white font-display font-bold text-lg border-b-4 border-[#b24113] shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Reintentar Misión 2</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Large Left / Right Touch Controls (shrink-0, >= 56px height) */}
      <div className="relative z-20 shrink-0 px-4 py-3 bg-[#1b0b38] border-t border-white/10 grid grid-cols-2 gap-3">
        <button
          type="button"
          aria-label="Mover a la izquierda"
          onPointerDown={() => {
            soundEngine.unlock();
            keysHeld.current.left = true;
          }}
          onPointerUp={() => {
            keysHeld.current.left = false;
          }}
          onPointerLeave={() => {
            keysHeld.current.left = false;
          }}
          onPointerCancel={() => {
            keysHeld.current.left = false;
          }}
          className="min-h-[56px] rounded-2xl bg-[#328990] hover:bg-[#3d9ea6] active:scale-95 text-white font-display font-bold text-lg border-b-4 border-[#205d62] flex items-center justify-center gap-2 shadow-md select-none cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 stroke-[3]" />
          <span>Izquierda</span>
        </button>

        <button
          type="button"
          aria-label="Mover a la derecha"
          onPointerDown={() => {
            soundEngine.unlock();
            keysHeld.current.right = true;
          }}
          onPointerUp={() => {
            keysHeld.current.right = false;
          }}
          onPointerLeave={() => {
            keysHeld.current.right = false;
          }}
          onPointerCancel={() => {
            keysHeld.current.right = false;
          }}
          className="min-h-[56px] rounded-2xl bg-[#328990] hover:bg-[#3d9ea6] active:scale-95 text-white font-display font-bold text-lg border-b-4 border-[#205d62] flex items-center justify-center gap-2 shadow-md select-none cursor-pointer"
        >
          <span>Derecha</span>
          <ChevronRight className="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
