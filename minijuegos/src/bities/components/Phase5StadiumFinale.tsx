import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Share2,
  Check,
  Download,
  MessageCircle,
  Copy,
  X,
} from 'lucide-react';
import { loadAsset } from '../game/assets';
import { soundEngine } from '../game/sound';
import type { GameStats, PlayerProfile } from '../game/types';
import { ChibiAvatar } from './ChibiAvatar';
import {
  buildGameShareUrl,
  canvasToPreparedCard,
  copyTextUniversal,
  openWhatsAppShare,
  sharePreparedCard,
  triggerPreparedDownload,
  type PreparedShareCard,
} from '../../shared/shareUtils';

interface Phase5StadiumFinaleProps {
  profile: PlayerProfile;
  stats: GameStats;
  onReplay: () => void;
}

interface LightstickParticle {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  hue: 'purple' | 'lilac' | 'gold' | 'turquoise';
}

interface ConfettiPiece {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function createBitiesCardCanvas(
  profile: PlayerProfile,
  stats: GameStats
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas');
  // 1080x1920 vertical format ideal for Instagram Stories & WhatsApp Status
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const [bgAsset, avatarAsset] = await Promise.all([
    loadAsset('bg-stadium'),
    loadAsset(profile.avatar === 'boy' ? 'avatar-boy' : 'avatar-girl'),
  ]);

  // 1. Background Stadium Image or Deep Purple Gradient
  ctx.fillStyle = '#160630';
  ctx.fillRect(0, 0, W, H);

  if (bgAsset.img) {
    const img = bgAsset.img;
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(20, 6, 44, 0.78)');
  grad.addColorStop(0.45, 'rgba(42, 14, 88, 0.55)');
  grad.addColorStop(0.82, 'rgba(18, 6, 40, 0.94)');
  grad.addColorStop(1, 'rgba(12, 4, 28, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative glowing lightstick dots
  const dotColors = ['#c4b5fd', '#fde047', '#e9d5ff', '#46a8b0', '#a78bfa'];
  for (let i = 0; i < 65; i++) {
    const px = ((i * 173) % 980) + 50;
    const py = 380 + ((i * 97) % 820);
    const rad = 4 + (i % 5) * 2;
    ctx.fillStyle = dotColors[i % dotColors.length];
    ctx.globalAlpha = 0.35 + (i % 4) * 0.15;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Outer festive border frame
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 44);
  ctx.stroke();

  // 2. Top Pill Header
  ctx.fillStyle = 'rgba(35, 15, 73, 0.92)';
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 210, 110, W - 420, 68, 34);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('✨ ESPECIAL NAVIDEÑO · LA CASA DE ZOLVE ✨', W / 2, 153);

  // 3. Main Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 68px "Fredoka", sans-serif';
  ctx.fillText('MISIÓN BITIES', W / 2, 265);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '700 38px "Fredoka", sans-serif';
  ctx.fillText('RUMBO AL ESTADIO · GRAN FINAL', W / 2, 320);

  // 4. Avatar Portrait Circle
  const cx = W / 2;
  const cy = 560;
  const radius = 175;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
  ctx.fillStyle = '#fde047';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#240f49';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (avatarAsset.img) {
    ctx.drawImage(avatarAsset.img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = '#5b21b6';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  // 5. Player Triumph Headline
  const displayName = profile.name?.trim() || 'ARMY';
  ctx.fillStyle = '#fde047';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('¡MISIÓN COMPLETADA!', W / 2, 815);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 58px "Fredoka", sans-serif';
  ctx.fillText(`¡Lo lograste, ${displayName}!`, W / 2, 885);

  ctx.fillStyle = '#e9d5ff';
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Viviste toda la ruta hasta encender el océano morado 💜', W / 2, 940);

  // 6. Stats Dashboard Box
  drawRoundedRect(ctx, 90, 1000, W - 180, 290, 36);
  ctx.fillStyle = 'rgba(28, 11, 59, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 3;
  ctx.stroke();

  const statItems = [
    { value: `${stats.messagesSent}`, label: 'Mensajes enviados' },
    { value: `${stats.fansRecruited}`, label: 'Fans ARMY unidos' },
    { value: '5 / 5', label: 'Mochila lista' },
  ];

  statItems.forEach((item, idx) => {
    const colX = 90 + ((W - 180) / 3) * (idx + 0.5);
    ctx.fillStyle = '#fde047';
    ctx.font = '700 64px "JetBrains Mono", monospace';
    ctx.fillText(item.value, colX, 1140);

    ctx.fillStyle = '#f3e8ff';
    ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.label, colX, 1195);
  });

  // 7. Christmas Greeting Card from La Casa de Zolve
  drawRoundedRect(ctx, 90, 1345, W - 180, 365, 36);
  ctx.fillStyle = '#fffaf3';
  ctx.fill();
  ctx.strokeStyle = '#e85d24';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#6d28d9';
  ctx.font = '700 44px "Fredoka", sans-serif';
  ctx.fillText('¡Feliz Navidad y felices conciertos!', W / 2, 1435);

  ctx.fillStyle = '#3d2c5e';
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Que la música, la alegría y la magia del océano', W / 2, 1500);
  ctx.fillText('morado nos sigan uniendo siempre en Chile.', W / 2, 1545);

  ctx.fillStyle = '#e85d24';
  ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Con cariño, La Casa de Zolve 🎄💜', W / 2, 1635);

  // 8. Footer Call-to-Action with Domain
  const hostLabel =
    typeof window !== 'undefined' && window.location.host
      ? window.location.host
      : 'minijuegos.lacasadezolve.cl';

  ctx.fillStyle = '#fde047';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Juega gratis en ${hostLabel}`, W / 2, 1805);

  return canvas;
}

export function Phase5StadiumFinale({
  profile,
  stats,
  onReplay,
}: Phase5StadiumFinaleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bgSrc, setBgSrc] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [preparedCard, setPreparedCard] = useState<PreparedShareCard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Pre-generate the Story PNG card immediately on mount so tablets & phones
  // can share/download synchronously inside the tap gesture without browser blocks!
  useEffect(() => {
    soundEngine.setTrack('none');
    soundEngine.playVictory();
    const anthemTimer = window.setTimeout(() => {
      soundEngine.setTrack('stadium');
    }, 850);

    let cancelled = false;
    let currentBlobUrl: string | null = null;

    loadAsset('bg-stadium').then((a) => {
      if (!cancelled && a.src) setBgSrc(a.src);
    });

    createBitiesCardCanvas(profile, stats).then(async (canvas) => {
      if (!canvas || cancelled) return;
      const safeName = (profile.name || 'army')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'army';
      const card = await canvasToPreparedCard(canvas, `mision-bities-${safeName}.png`);
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
      window.clearTimeout(anthemTimer);
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [profile, stats]);

  // Animated purple ocean lightsticks & celebratory confetti overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const lights: LightstickParticle[] = Array.from({ length: 78 }, (_, i) => ({
      x: Math.random(),
      y: 0.28 + Math.random() * 0.56,
      r: 2 + Math.random() * 3.2,
      phase: i * 0.45,
      speed: 2.2 + Math.random() * 2.2,
      hue:
        i % 9 === 0
          ? 'gold'
          : i % 7 === 0
            ? 'turquoise'
            : i % 2 === 0
              ? 'purple'
              : 'lilac',
    }));

    const confettiColors = ['#c4b5fd', '#e85d24', '#46a8b0', '#fde047', '#f5f3ff'];
    const confetti: ConfettiPiece[] = Array.from({ length: 34 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vy: 0.08 + Math.random() * 0.11,
      vx: (Math.random() - 0.5) * 0.05,
      size: 4 + Math.random() * 4.5,
      color: confettiColors[i % confettiColors.length],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 3.5,
    }));

    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - lastTs) / 1000, 0.001), 0.05);
      lastTs = now;
      elapsed += dt;

      const w = canvas.clientWidth || 360;
      const h = canvas.clientHeight || 640;
      ctx.clearRect(0, 0, w, h);

      for (const l of lights) {
        const swayX = Math.sin(elapsed * l.speed + l.phase) * 5;
        const glowAlpha = 0.45 + 0.5 * Math.sin(elapsed * l.speed * 1.1 + l.phase);
        const cx = l.x * w + swayX;
        const cy = l.y * h;

        const color =
          l.hue === 'gold'
            ? `rgba(253, 224, 71, ${glowAlpha})`
            : l.hue === 'turquoise'
              ? `rgba(70, 168, 176, ${glowAlpha})`
              : l.hue === 'lilac'
                ? `rgba(233, 213, 255, ${glowAlpha})`
                : `rgba(167, 139, 250, ${glowAlpha})`;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, l.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const c of confetti) {
        c.y += c.vy * dt;
        c.x += c.vx * dt;
        c.rot += c.vrot * dt;
        if (c.y > 1.05) {
          c.y = -0.05;
          c.x = Math.random();
        }
        ctx.save();
        ctx.translate(c.x * w, c.y * h);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size * 0.5, -c.size * 0.3, c.size, c.size * 0.6);
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const shareUrl = buildGameShareUrl('bities');
  const shareText = `¡Lo logré en Misión BITIES: Rumbo al Estadio! 💜✨ Envié ${stats.messagesSent} mensajes, uní a ${stats.fansRecruited} fans ARMY y llegué al estadio con La Casa de Zolve. ¡Juega aquí! 🎄👇\n${shareUrl}`;

  const showToast = (msg: string) => {
    setShareToast(msg);
    window.setTimeout(() => setShareToast(null), 3200);
  };

  const handleShare = async () => {
    soundEngine.playClick();
    const outcome = await sharePreparedCard(preparedCard, {
      title: 'Misión BITIES: Rumbo al Estadio',
      text: shareText,
      url: shareUrl,
    });

    if (outcome === 'shared-file') {
      showToast('¡Tarjeta lista en tu menú de compartir!');
    } else if (outcome === 'shared-link') {
      showToast('¡Enlace y resultado compartidos!');
    } else if (outcome === 'downloaded-and-copied') {
      showToast('¡Tarjeta PNG descargada y enlace copiado!');
    }
  };

  const handleCopyLink = async () => {
    soundEngine.playClick();
    const ok = await copyTextUniversal(shareText);
    showToast(ok ? '¡Enlace y resultado copiados!' : shareUrl);
  };

  const handleWhatsAppShare = () => {
    soundEngine.playClick();
    openWhatsAppShare(shareText);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#180736]">
      {/* Illuminated Purple Stadium Background */}
      {bgSrc && (
        <img
          src={bgSrc}
          alt="Estadio de noche iluminado de morado"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(22,7,48,0.62) 0%, rgba(44,15,92,0.38) 42%, rgba(20,7,44,0.92) 78%, rgba(16,6,36,0.97) 100%)',
        }}
      />

      {/* Live 60fps Lightsticks & Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Foreground Content */}
      <div className="relative z-20 flex-1 flex flex-col justify-between px-4 sm:px-5 pt-13 pb-4 overflow-y-auto">
        {/* Top Personalized Triumph Headline */}
        <div className="text-center animate-pop-in">
          <p className="text-xs font-bold tracking-wider uppercase text-[#fde047] mb-1">
            Gran Final · Estadio Iluminado
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-[26px] text-white leading-snug drop-shadow-[0_4px_12px_rgba(18,6,40,0.9)] text-balance">
            ¡Lo lograste, {profile.name}! Viviste toda la ruta hasta el estadio.
          </h1>
        </div>

        {/* Center Celebrating Chibi Avatar */}
        <div className="flex flex-col items-center my-1">
          <ChibiAvatar
            avatar={profile.avatar}
            size="xl"
            wearsHeadband
            holdingLightstick
            jumping
          />
          <p className="mt-2 text-sm font-semibold text-[#f3e8ff] text-center drop-shadow">
            {stats.messagesSent} mensajes · {stats.fansRecruited} fans unidos · 5/5 objetos listos
          </p>
        </div>

        {/* Christmas Card Signed by La Casa de Zolve + Universal Action Buttons */}
        <div className="flex flex-col gap-2 w-full max-w-[390px] mx-auto">
          <div className="bg-[#fffaf3] text-[#1f0d3e] rounded-2xl p-3 border-2 border-[#e85d24] shadow-[0_12px_32px_rgba(16,6,36,0.65)] text-center">
            <p className="font-display font-bold text-base sm:text-lg text-[#6d28d9] leading-snug">
              ¡Feliz Navidad y felices conciertos!
            </p>
            <p className="text-xs text-[#3d2c5e] mt-0.5 leading-relaxed">
              Que la música, la alegría y la magia del océano morado nos sigan uniendo en Chile.
            </p>
            <p className="mt-1 text-xs sm:text-sm font-extrabold text-[#e85d24]">
              Con cariño, La Casa de Zolve
            </p>
          </div>

          {shareToast && (
            <div className="animate-pop-in bg-[#328990] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
              <Check className="w-4 h-4 stroke-[3] shrink-0" />
              <span>{shareToast}</span>
            </div>
          )}

          {/* Primary Share Action (Synchronous Native Share Sheet with PNG attached) */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#6d28d9] hover:bg-[#7c3aed] active:scale-[0.98] text-white font-display font-bold text-sm sm:text-base border-b-4 border-[#4c1d95] shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#fde047]" />
            <span>
              {preparedCard
                ? 'Compartir tarjeta (IG / Redes)'
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
                  soundEngine.playClick();
                  setPreviewOpen(true);
                  showToast('¡Descargando tarjeta PNG!');
                }}
                className="min-h-[44px] px-2 py-2 rounded-xl bg-[#328990] hover:bg-[#3ca0a8] active:scale-[0.98] text-white font-display font-bold text-xs border-b-4 border-[#1f5d62] shadow flex items-center justify-center gap-1 transition-all no-underline cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Descargar</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="min-h-[44px] px-2 py-2 rounded-xl bg-[#328990]/60 text-white/70 font-display font-bold text-xs border-b-4 border-[#1f5d62] flex items-center justify-center gap-1"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>...</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="min-h-[44px] px-2 py-2 rounded-xl bg-[#25D366] hover:bg-[#2be06f] active:scale-[0.98] text-[#072614] font-display font-bold text-xs border-b-4 border-[#15803d] shadow flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[44px] px-2 py-2 rounded-xl bg-[#2a1257] hover:bg-[#381973] active:scale-[0.98] text-[#e9d5ff] font-display font-bold text-xs border-b-4 border-[#180836] shadow flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span>Copiar link</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onReplay();
            }}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#e85d24] hover:bg-[#f26b34] active:scale-[0.98] text-white font-display font-bold text-sm border-b-4 border-[#b24113] shadow flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Volver a jugar</span>
          </button>
        </div>
      </div>

      {/* Tablet / Mobile Friendly Image Save Modal */}
      {previewOpen && preparedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative flex max-h-[92dvh] w-full max-w-sm flex-col items-center gap-3 rounded-3xl border-2 border-[#fde047] bg-[#1b0b38] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#fde047]">
                📱 En tablet/celular también puedes mantener presionada la imagen → Guardar en Fotos
              </span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2a1257] text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <img
              src={preparedCard.dataUrl}
              alt="Tarjeta Misión BITIES"
              className="max-h-[66dvh] w-auto rounded-xl border border-purple-300/40 object-contain"
            />

            <div className="grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => triggerPreparedDownload(preparedCard)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#328990] py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Guardar archivo</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#6d28d9] py-2.5 text-xs font-bold text-[#fde047] cursor-pointer"
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
