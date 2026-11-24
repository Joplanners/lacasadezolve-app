import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  MessageCircle,
  RotateCcw,
  Share2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { getMemberById, KEY_VISUAL_IMAGE } from '../game/characters';
import {
  RANK_THRESHOLDS,
  type BestRecord,
  type HudSnapshot,
  type RankGrade,
  type ScoreBreakdown,
} from '../game/types';
import {
  buildGameShareUrl,
  canvasToPreparedCard,
  copyTextUniversal,
  openWhatsAppShare,
  sharePreparedCard,
  triggerPreparedDownload,
  type PreparedShareCard,
} from '../../shared/shareUtils';

interface EndingOverlayProps {
  hud: HudSnapshot;
  bestRecord: BestRecord | null;
  onResume: () => void;
  onRestartSame: () => void;
  onSwitchMember: () => void;
  onGoTitle: () => void;
  onShowScorecard: () => void;
  onShowKeyVisual: () => void;
  onBackToHub?: () => void;
}

const RANK_STYLES: Record<RankGrade, { bg: string; text: string; border: string }> = {
  S: { bg: '#fde047', text: '#050811', border: '#00f0ff' },
  A: { bg: '#00f0ff', text: '#050811', border: '#ffffff' },
  B: { bg: '#c084fc', text: '#050811', border: '#e9d5ff' },
  C: { bg: '#94a3b8', text: '#050811', border: '#e2e8f0' },
};

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => (img.naturalWidth > 0 ? resolve(img) : resolve(null));
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function createSuiatsuStoryCanvas(
  memberName: string,
  memberPortrait: string,
  accentColor: string,
  breakdown: ScoreBreakdown,
  isVictory: boolean
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas');
  // 1080x1920 vertical format ideal for Instagram Stories, WhatsApp & Mobile Gallery
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const heroImg = await loadImageSafe(isVictory ? KEY_VISUAL_IMAGE : memberPortrait);

  // 1. Cel-shaded abyssal gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a2548');
  grad.addColorStop(0.38, '#071934');
  grad.addColorStop(0.75, '#040e21');
  grad.addColorStop(1, '#020712');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle cel-shaded water bubbles
  for (let i = 0; i < 36; i++) {
    const bx = ((i * 197) % 980) + 50;
    const by = ((i * 131) % 1780) + 70;
    const br = 5 + (i % 5) * 4;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(253,224,71,0.28)' : 'rgba(0,240,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Outer manga ink frame
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = '#050811';
  ctx.lineWidth = 4;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  // 2. Top Brand Banner
  ctx.fillStyle = '#051126';
  ctx.fillRect(80, 86, W - 160, 68);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 4;
  ctx.strokeRect(80, 86, W - 160, 68);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('🌊 ESPECIAL NAVIDEÑO · LA CASA DE ZOLVE 🌊', W / 2, 130);

  // 3. Game Title Lockup
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 84px "Antonio", sans-serif';
  ctx.fillText('LOS PERDIDOS: SUIATSU', W / 2, 255);

  ctx.fillStyle = isVictory ? '#00f0ff' : '#fb7185';
  ctx.font = '700 42px "Antonio", sans-serif';
  ctx.fillText(
    isVictory ? 'FIN — MISIÓN COMPLETADA' : 'RESULTADO DE MISIÓN SUBMARINA',
    W / 2,
    312
  );

  // 4. Visual Artwork Showcase + Rank Stamp Overlay
  const artX = 90;
  const artY = 355;
  const artW = 630;
  const artH = 680;

  ctx.fillStyle = '#050811';
  ctx.fillRect(artX + 10, artY + 10, artW, artH);
  const artBg = ctx.createLinearGradient(0, artY, 0, artY + artH);
  artBg.addColorStop(0, '#e0f2fe');
  artBg.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = artBg;
  ctx.fillRect(artX, artY, artW, artH);

  if (heroImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(artX, artY, artW, artH);
    ctx.clip();
    const scale = Math.max(artW / heroImg.naturalWidth, artH / heroImg.naturalHeight);
    const dw = heroImg.naturalWidth * scale;
    const dh = heroImg.naturalHeight * scale;
    ctx.drawImage(heroImg, artX + (artW - dw) / 2, artY + (artH - dh) * 0.15, dw, dh);
    ctx.restore();
  }

  ctx.strokeStyle = accentColor || '#00f0ff';
  ctx.lineWidth = 6;
  ctx.strokeRect(artX, artY, artW, artH);

  // Right Column: Giant Rank Stamp + Protagonist Badge
  const rs = RANK_STYLES[breakdown.rank];
  const rx = 755;
  const ry = 355;
  const rw = 235;
  const rh = 310;

  ctx.fillStyle = rs.border;
  ctx.fillRect(rx + 12, ry + 12, rw, rh);
  ctx.fillStyle = rs.bg;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = '#050811';
  ctx.lineWidth = 8;
  ctx.strokeRect(rx, ry, rw, rh);

  ctx.fillStyle = '#050811';
  ctx.textAlign = 'center';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('RANGO', rx + rw / 2, ry + 62);
  ctx.font = '700 185px "Antonio", sans-serif';
  ctx.fillText(breakdown.rank, rx + rw / 2, ry + 245);

  // Protagonist Box under Rank
  const px = 755;
  const py = 700;
  const pw = 235;
  const ph = 335;
  ctx.fillStyle = '#071830';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(px, py, pw, ph);

  ctx.fillStyle = '#67e8f9';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PROTAGONISTA', px + pw / 2, py + 58);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px "Antonio", sans-serif';
  ctx.fillText(memberName.toUpperCase(), px + pw / 2, py + 130);

  ctx.fillStyle = '#fde047';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PUNTAJE TOTAL', px + pw / 2, py + 215);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 42px "JetBrains Mono", monospace';
  ctx.fillText(breakdown.totalScore.toLocaleString('es-CL'), px + pw / 2, py + 275);

  // 5. Rank Title Banner
  ctx.fillStyle = '#071a36';
  ctx.fillRect(90, 1075, W - 180, 96);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(90, 1075, W - 180, 96);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = '700 40px "Antonio", sans-serif';
  ctx.fillText(breakdown.rankTitle.toUpperCase(), W / 2, 1138);

  // 6. Detailed Stats Table
  const statsY = 1205;
  ctx.fillStyle = 'rgba(5, 17, 38, 0.94)';
  ctx.fillRect(90, statsY, W - 180, 440);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(90, statsY, W - 180, 440);

  const rows = [
    ['Puntaje Final', `${breakdown.totalScore.toLocaleString('es-CL')} pts`],
    ['Integrantes Rescatados', `${breakdown.rescuedCount} / 7`],
    ['Perlas Luminosas', `${breakdown.pearlsCollected}`],
    ['Combos Épicos / Combo Máx', `${breakdown.epicCombosCount} · ${breakdown.maxCombo}x`],
    ['Tiempo Restante', `${breakdown.timeRemainingSeconds}s`],
  ];

  rows.forEach(([label, value], idx) => {
    const y = statsY + 76 + idx * 76;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(label, 135, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = idx === 0 ? '#fde047' : '#00f0ff';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText(value, W - 135, y);
  });

  // 7. Footer Call to Action with Domain
  const hostLabel =
    typeof window !== 'undefined' && window.location.host
      ? window.location.host
      : 'minijuegos.lacasadezolve.cl';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#67e8f9';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('¿Puedes superar mi marca y llegar al Rango S?', W / 2, 1735);

  ctx.fillStyle = '#fde047';
  ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Juega gratis en ${hostLabel}`, W / 2, 1795);

  return canvas;
}

export function EndingOverlay({
  hud,
  bestRecord,
  onResume,
  onRestartSame,
  onSwitchMember,
  onGoTitle,
  onShowScorecard,
  onShowKeyVisual,
  onBackToHub,
}: EndingOverlayProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [preparedCard, setPreparedCard] = useState<PreparedShareCard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isResultScreen = hud.screen === 'VICTORY' || hud.screen === 'GAME_OVER';
  const isVictory = hud.screen === 'VICTORY';
  const breakdown = hud.scoreBreakdown;
  const member = getMemberById(hud.selectedMemberId);

  // Pre-generate the PNG card immediately when the Victory / Game Over screen opens
  // so tablet & mobile browsers have the File ready synchronously on tap!
  useEffect(() => {
    if (!isResultScreen || !breakdown) {
      setPreparedCard(null);
      setPreviewOpen(false);
      return;
    }

    let cancelled = false;
    let currentBlobUrl: string | null = null;

    createSuiatsuStoryCanvas(
      member.name,
      member.portrait,
      member.accentColor,
      breakdown,
      isVictory
    ).then(async (canvas) => {
      if (!canvas || cancelled) return;
      const filename = `los-perdidos-suiatsu-rango-${breakdown.rank}.png`;
      const card = await canvasToPreparedCard(canvas, filename);
      if (cancelled) {
        if (card) URL.revokeObjectURL(card.blobUrl);
        return;
      }
      if (card) {
        currentBlobUrl = card.blobUrl;
        setPreparedCard(card);
      }
    });

    return () => {
      cancelled = true;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [isResultScreen, isVictory, breakdown, member.name, member.portrait, member.accentColor]);

  // Allow Enter / Space to advance from full-screen Key Visual Freeze Frame to Scorecard
  useEffect(() => {
    if (hud.screen !== 'VICTORY_FREEZE') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onShowScorecard();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.screen, onShowScorecard]);

  const showFeedback = (msg: string) => {
    setShareFeedback(msg);
    window.setTimeout(() => setShareFeedback(null), 3200);
  };

  if (hud.screen === 'PAUSED') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#030812]/80 p-4">
        <div className="cel-box w-full max-w-md bg-[#07162b] p-6">
          <div className="text-xs font-bold tracking-wider text-cyan-300">
            PARTIDA PAUSADA · {member.name.toUpperCase()}
          </div>
          <h2 className="mt-1 font-display text-4xl font-bold tracking-wide text-white cel-text-shadow">
            PAUSA
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Rescatados: {hud.rescuedIds.length}/7 · Perlas: {hud.pearls} · Combos Épicos: {hud.epicCombos}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="cel-box-cyan w-full bg-[#00f0ff] py-3 font-display text-xl font-bold tracking-wider text-[#050811] hover:bg-[#67e8f9] cursor-pointer"
            >
              CONTINUAR MISIÓN
            </button>
            <button
              type="button"
              onClick={onRestartSame}
              className="cel-box-sm w-full bg-[#0c2342] py-2.5 text-sm font-bold text-white hover:bg-[#13325b] cursor-pointer"
            >
              Reiniciar con {member.name}
            </button>
            <button
              type="button"
              onClick={onSwitchMember}
              className="cel-box-sm w-full bg-[#0c2342] py-2.5 text-sm font-bold text-cyan-200 hover:bg-[#13325b] cursor-pointer"
            >
              Cambiar de integrante
            </button>
            <button
              type="button"
              onClick={onGoTitle}
              className="py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Volver al título del juego
            </button>
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="cel-box-sm w-full bg-[#091b33] py-2 text-xs font-bold text-amber-300 hover:bg-[#112d52] cursor-pointer"
              >
                ← Volver al inicio (Cambiar de minijuego)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STAGE 1 OF FINALE: 100% Full-Screen Anime Opening Key Visual Freeze Frame (unobstructed!)
  if (hud.screen === 'VICTORY_FREEZE') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#04142b] via-[#07264d] to-[#020916] p-4 md:p-6">
        <div className="animate-flash-out pointer-events-none fixed inset-0 z-40 bg-white" />

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {[
            { top: '12%', left: '10%', size: 18, delay: '0s' },
            { top: '24%', right: '11%', size: 22, delay: '0.4s' },
            { top: '64%', left: '8%', size: 16, delay: '0.9s' },
            { top: '72%', right: '9%', size: 20, delay: '1.3s' },
            { top: '42%', left: '16%', size: 12, delay: '0.7s' },
            { top: '38%', right: '16%', size: 14, delay: '1.1s' },
          ].map((d, i) => (
            <div
              key={i}
              className="animate-droplet absolute rounded-full border-2 border-[#050811] bg-cyan-200/80 shadow-[2px_2px_0px_#00f0ff]"
              style={{
                top: d.top,
                left: d.left,
                right: d.right,
                width: d.size,
                height: d.size,
                animationDelay: d.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          <div className="text-xs font-bold tracking-[0.28em] text-cyan-300">
            CIERRE DE OPENING · LOS 8 REUNIDOS EN LA SUPERFICIE
          </div>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-widest text-white cel-text-shadow sm:text-5xl">
            FIN — LOS PERDIDOS
          </h1>
        </div>

        <div className="relative z-10 my-2 flex min-h-0 flex-1 items-center justify-center">
          <div className="cel-box-cyan relative h-full max-h-[68vh] overflow-hidden bg-gradient-to-b from-cyan-50 via-sky-100 to-cyan-900 p-1.5">
            <img
              src={KEY_VISUAL_IMAGE}
              alt="FIN — Los Perdidos: Suiatsu Key Visual Final"
              referrerPolicy="no-referrer"
              className="h-full max-h-[65vh] w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="text-xs font-semibold text-cyan-200/85">
            Protagonista de esta misión: <span className="text-amber-300">{member.name}</span>
          </div>
          <button
            type="button"
            onClick={onShowScorecard}
            className="cel-box-cyan flex items-center gap-2.5 bg-[#00f0ff] px-7 py-3 font-display text-2xl font-bold tracking-wider text-[#050811] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#67e8f9] whitespace-nowrap cursor-pointer"
          >
            VER PUNTAJE Y RANGO
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!isResultScreen || !breakdown) {
    return null;
  }

  const rankStyle = RANK_STYLES[breakdown.rank];
  const progressToS = Math.min(100, Math.round((breakdown.totalScore / RANK_THRESHOLDS.S) * 100));
  const shareUrl = buildGameShareUrl('los-perdidos');
  const summaryText = [
    `🌊 LOS PERDIDOS: SUIATSU — Rango ${breakdown.rank} (${breakdown.rankTitle})`,
    `⭐ Puntaje Final: ${breakdown.totalScore.toLocaleString('es-CL')} pts`,
    `🧑‍🎤 Protagonista: ${member.name}`,
    `🛟 Rescatados: ${breakdown.rescuedCount}/7 | 🦪 Perlas: ${breakdown.pearlsCollected} | ⚡ Combos Épicos: ${breakdown.epicCombosCount} (${breakdown.maxCombo}x máx)`,
    `¿Puedes superar mi marca y llegar al Rango S en La Casa de Zolve? 👇`,
    shareUrl,
  ].join('\n');

  const handleShareResults = async () => {
    const outcome = await sharePreparedCard(preparedCard, {
      title: 'Los Perdidos: Suiatsu — Mis Resultados',
      text: summaryText,
      url: shareUrl,
    });

    if (outcome === 'shared-file') {
      showFeedback('¡Tarjeta lista en tu menú de compartir!');
    } else if (outcome === 'shared-link') {
      showFeedback('¡Enlace y puntaje compartidos!');
    } else if (outcome === 'downloaded-and-copied') {
      showFeedback('¡Tarjeta descargada y enlace copiado!');
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyTextUniversal(summaryText);
    showFeedback(ok ? '¡Enlace y puntaje copiados al portapapeles!' : shareUrl);
  };

  const handleWhatsApp = () => {
    openWhatsAppShare(summaryText);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#030916]/92 p-3 sm:p-4 md:p-6">
      <div className="cel-box my-auto mx-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden bg-[#061428] lg:grid-cols-12">
        {/* Left Column: Key Visual Miniature (Victory) or Defeat Frame */}
        <div className="relative flex flex-col items-center justify-center border-b-2 border-[#050811] bg-[#041020] p-4 lg:col-span-5 lg:border-b-0 lg:border-r-2">
          {isVictory ? (
            <>
              <div className="cel-box-sm relative w-full max-w-[280px] overflow-hidden bg-gradient-to-b from-cyan-50 via-sky-100 to-cyan-900">
                <img
                  src={KEY_VISUAL_IMAGE}
                  alt="FIN — Los Perdidos: Suiatsu Key Visual Final"
                  referrerPolicy="no-referrer"
                  className="h-[240px] w-full object-contain sm:h-[330px]"
                />
              </div>
              <div className="mt-3 text-center">
                <div className="font-display text-3xl font-bold tracking-widest text-[#00f0ff] cel-text-shadow">
                  FIN — LOS PERDIDOS
                </div>
                <div className="text-xs font-semibold text-cyan-200/80">
                  Protagonista: {member.name}
                </div>
              </div>
              <button
                type="button"
                onClick={onShowKeyVisual}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                Volver a ver Key Visual completo
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="cel-box-sm h-44 w-36 overflow-hidden bg-slate-900">
                <img
                  src={member.portrait}
                  alt={member.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-top grayscale-[35%]"
                />
              </div>
              <div className="mt-3 font-display text-4xl font-bold tracking-wider text-rose-400 cel-text-shadow">
                MISIÓN FALLIDA
              </div>
              <p className="mt-1.5 max-w-xs text-sm text-slate-300">{hud.gameOverReason}</p>
            </div>
          )}
        </div>

        {/* Right Column: Complete Score Breakdown + Universal Share & Download */}
        <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 md:p-6 lg:col-span-7">
          {/* Rank Header Banner */}
          <div className="flex items-center justify-between gap-4 border-b border-cyan-500/20 pb-3">
            <div>
              <div className="text-xs font-bold tracking-wider text-cyan-300">
                EVALUACIÓN DE OPENING · RANGO OBTENIDO
              </div>
              <h2 className="mt-0.5 font-display text-3xl font-bold tracking-wide text-white cel-text-shadow">
                {breakdown.rankTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {breakdown.rankMessage}
              </p>
            </div>

            <div
              className="animate-rank-slam cel-box flex h-20 w-20 shrink-0 flex-col items-center justify-center"
              style={{
                backgroundColor: rankStyle.bg,
                color: rankStyle.text,
                boxShadow: `4px 4px 0px ${rankStyle.border}`,
              }}
            >
              <span className="text-[10px] font-extrabold leading-none tracking-widest">RANGO</span>
              <span className="font-display text-5xl font-bold leading-none">{breakdown.rank}</span>
            </div>
          </div>

          {/* Itemized Score Breakdown Table */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-slate-200">
              <span>
                Miembros rescatados ({breakdown.rescuedCount}/7)
                {breakdown.allRescuedBonus > 0 ? ' + Bono Equipo' : ''}
              </span>
              <span className="font-mono-num font-bold text-cyan-300">
                +{(breakdown.rescuedPoints + breakdown.allRescuedBonus).toLocaleString('es-CL')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-200">
              <span>Perlas luminosas recolectadas ({breakdown.pearlsCollected})</span>
              <span className="font-mono-num font-bold text-amber-300">
                +{breakdown.pearlPoints.toLocaleString('es-CL')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-200">
              <span>
                Combos épicos ({breakdown.epicCombosCount}) · Combo máx ({breakdown.maxCombo}x)
              </span>
              <span className="font-mono-num font-bold text-fuchsia-300">
                +{breakdown.comboPoints.toLocaleString('es-CL')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-200">
              <span>Tiempo restante ({breakdown.timeRemainingSeconds}s)</span>
              <span className="font-mono-num font-bold text-emerald-300">
                +{breakdown.timePoints.toLocaleString('es-CL')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-200">
              <span>Combate y peligros superados</span>
              <span className="font-mono-num font-bold text-slate-200">
                +{breakdown.baseCombatScore.toLocaleString('es-CL')}
              </span>
            </div>

            {breakdown.bossBonus > 0 && (
              <div className="flex items-center justify-between text-cyan-200">
                <span>Bono: El Núcleo del Terremoto derrotado</span>
                <span className="font-mono-num font-bold text-[#00f0ff]">
                  +{breakdown.bossBonus.toLocaleString('es-CL')}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-baseline justify-between border-t-2 border-cyan-400/30 pt-2">
              <span className="font-display text-2xl font-bold tracking-wider text-white">
                PUNTAJE FINAL
              </span>
              <span className="font-mono-num text-3xl font-bold text-amber-300 cel-text-shadow">
                {breakdown.totalScore.toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          {/* Rank Progression Incentive Bar */}
          <div className="border-t border-cyan-500/20 pt-2">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-cyan-200">
                <Trophy className="h-3.5 w-3.5 text-amber-300" />
                {breakdown.rank === 'S'
                  ? '¡Rango S alcanzado! Máximo honor en Suiatsu'
                  : `Meta Rango ${breakdown.nextRank}: faltan ${breakdown.pointsToNextRank.toLocaleString('es-CL')} pts`}
              </span>
              {bestRecord && (
                <span className="font-mono-num text-slate-300">
                  Récord: {bestRecord.bestScore.toLocaleString('es-CL')} ({bestRecord.bestRank})
                </span>
              )}
            </div>
            <div className="h-2 w-full border border-[#050811] bg-[#0b1f3a]">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${progressToS}%`,
                  backgroundColor: breakdown.rank === 'S' ? '#fde047' : '#00f0ff',
                }}
              />
            </div>
          </div>

          {/* Feedback Toast */}
          {shareFeedback && (
            <div className="cel-box-sm flex items-center justify-center gap-2 bg-emerald-900/90 px-3 py-2 text-xs font-bold text-emerald-200">
              <Check className="h-4 w-4 shrink-0 text-emerald-300" />
              <span>{shareFeedback}</span>
            </div>
          )}

          {/* Universal Share & Download Suite (Works on Tablets, Mobile & PC) */}
          <div className="flex flex-col gap-2">
            {/* Primary Button: Native Share Sheet with PNG Card attached */}
            <button
              type="button"
              onClick={handleShareResults}
              className="cel-box-sm flex min-h-[44px] w-full items-center justify-center gap-2 bg-[#163869] px-4 py-2.5 text-sm font-bold text-[#fde047] hover:bg-[#1e4985] cursor-pointer"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span>
                {preparedCard
                  ? 'Compartir tarjeta en Redes (IG / Apps)'
                  : 'Preparando tarjeta...'}
              </span>
            </button>

            {/* Secondary Row: Real <a download> + WhatsApp + Copy Link */}
            <div className="grid grid-cols-3 gap-2">
              {preparedCard ? (
                <a
                  href={preparedCard.blobUrl}
                  download={preparedCard.filename}
                  onClick={() => {
                    setPreviewOpen(true);
                    showFeedback('¡Descargando tarjeta PNG!');
                  }}
                  className="cel-box-sm flex min-h-[42px] items-center justify-center gap-1.5 bg-[#0c2342] px-2.5 py-2 text-xs font-bold text-amber-200 hover:bg-[#143662] text-center no-underline cursor-pointer"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>Descargar PNG</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cel-box-sm flex min-h-[42px] items-center justify-center gap-1.5 bg-[#0c2342]/60 px-2.5 py-2 text-xs font-bold text-amber-200/60"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>Generando...</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleWhatsApp}
                className="cel-box-sm flex min-h-[42px] items-center justify-center gap-1.5 bg-[#25D366] px-2.5 py-2 text-xs font-bold text-[#051f10] hover:bg-[#34e275] cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="cel-box-sm flex min-h-[42px] items-center justify-center gap-1.5 bg-[#0c2342] px-2.5 py-2 text-xs font-bold text-cyan-200 hover:bg-[#143662] cursor-pointer"
              >
                <Copy className="h-4 w-4 shrink-0" />
                <span>Copiar link</span>
              </button>
            </div>
          </div>

          {/* Replay & Switch Character CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSwitchMember}
              className="cel-box-cyan flex flex-1 items-center justify-center gap-2 bg-[#00f0ff] px-5 py-3 font-display text-xl font-bold tracking-wider text-[#050811] hover:bg-[#67e8f9] whitespace-nowrap cursor-pointer"
            >
              <Users className="h-5 w-5" />
              JUGAR CON OTRO INTEGRANTE
            </button>
            <button
              type="button"
              onClick={onRestartSame}
              className="cel-box-sm flex items-center justify-center gap-2 bg-[#0c2342] px-5 py-3 font-display text-xl font-bold tracking-wider text-white hover:bg-[#143662] whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              REINTENTAR
            </button>
          </div>

          {onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="text-center text-xs font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
            >
              ← Volver al inicio (Cambiar de minijuego)
            </button>
          )}
        </div>
      </div>

      {/* Tablet / Mobile Friendly Image Save Modal (allows long-press -> Save to Photos on iPad/Android/WebViews) */}
      {previewOpen && preparedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="cel-box relative flex max-h-[92dvh] w-full max-w-md flex-col items-center gap-3 bg-[#07162b] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-bold text-amber-300">
                📱 En tablet/celular también puedes mantener presionada la imagen → Guardar en Fotos
              </span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="cel-box-sm flex h-8 w-8 shrink-0 items-center justify-center bg-[#0c2342] text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <img
              src={preparedCard.dataUrl}
              alt="Tarjeta de resultado Los Perdidos: Suiatsu"
              className="max-h-[68dvh] w-auto rounded border-2 border-cyan-400 object-contain"
            />

            <div className="grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => triggerPreparedDownload(preparedCard)}
                className="cel-box-sm flex items-center justify-center gap-1.5 bg-[#00f0ff] py-2.5 text-xs font-bold text-[#050811] cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Guardar archivo</span>
              </button>
              <button
                type="button"
                onClick={handleShareResults}
                className="cel-box-sm flex items-center justify-center gap-1.5 bg-[#163869] py-2.5 text-xs font-bold text-[#fde047] cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Compartir en Apps</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
