/**
 * High-DPI Canvas sprite & background rendering utilities.
 * Uses custom /assets/* images if provided; otherwise renders adorable,
 * crisp hand-crafted 2D RPG chibi sprites & items (zero broken frames).
 */

import type { LoadedAsset } from './assets';
import type { AvatarId, ChecklistItemId } from './types';

/**
 * Draws a background image covering the canvas cleanly.
 * Automatically crops the top half when `cropTopHalf` is set (for our bundled room art).
 */
export function drawCoverBackground(
  ctx: CanvasRenderingContext2D,
  asset: LoadedAsset | undefined,
  width: number,
  height: number,
  verticalOffsetPx = 0
): boolean {
  if (!asset?.img) return false;
  const img = asset.img;

  const srcX = asset.cropTopHalf ? img.naturalWidth * 0.025 : 0;
  const srcY = asset.cropTopHalf ? img.naturalHeight * 0.01 : 0;
  const srcW = asset.cropTopHalf ? img.naturalWidth * 0.95 : img.naturalWidth;
  const srcH = asset.cropTopHalf ? img.naturalHeight * 0.485 : img.naturalHeight;

  const canvasRatio = width / height;
  const srcRatio = srcW / srcH;

  let drawW = width;
  let drawH = height;
  let offsetX = 0;
  let offsetY = 0;

  if (srcRatio > canvasRatio) {
    drawH = height;
    drawW = height * srcRatio;
    offsetX = (width - drawW) / 2;
  } else {
    drawW = width;
    drawH = width / srcRatio;
    offsetY = (height - drawH) / 2;
  }

  ctx.drawImage(
    img,
    srcX,
    srcY,
    srcW,
    srcH,
    offsetX,
    offsetY + verticalOffsetPx,
    drawW,
    drawH
  );
  return true;
}

/**
 * Draws the player chibi character on canvas with walking bob, squash-and-stretch,
 * glowing purple lightstick, and optional "BITIES" purple headband.
 */
export function drawPlayerChibi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  avatar: AvatarId,
  opts: {
    scale?: number;
    time: number;
    walking?: boolean;
    facing?: number;
    wearsHeadband?: boolean;
    hasLightstick?: boolean;
    avatarAsset?: LoadedAsset;
    hurtFlash?: number;
    label?: string;
  }
): void {
  const scale = opts.scale ?? 1;
  const t = opts.time;
  const bob = opts.walking ? Math.abs(Math.sin(t * 11)) * 5 : Math.sin(t * 3.5) * 1.8;
  const tilt = opts.walking ? Math.sin(t * 11) * 0.07 : 0;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(20, 8, 42, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 24 * scale, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob * scale);
  ctx.rotate(tilt);

  if (opts.hurtFlash && opts.hurtFlash > 0 && Math.floor(opts.hurtFlash * 16) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  // If user supplied a custom transparent sprite in /assets/avatar-*.png, draw it directly
  if (opts.avatarAsset?.isCustom && opts.avatarAsset.img) {
    const size = 62 * scale;
    ctx.drawImage(opts.avatarAsset.img, -size / 2, -size * 0.65, size, size);
  } else {
    // Adorable TinyTAN-style full chibi body + circular generated portrait head or hand-drawn chibi
    const isGirl = avatar === 'girl';

    // Little legs
    const legSwing = opts.walking ? Math.sin(t * 11) * 4.5 : 0;
    ctx.fillStyle = '#2d1c4d';
    ctx.beginPath();
    ctx.roundRect(-9 * scale, (12 + legSwing * 0.3) * scale, 7 * scale, 12 * scale, 4 * scale);
    ctx.roundRect(2 * scale, (12 - legSwing * 0.3) * scale, 7 * scale, 12 * scale, 4 * scale);
    ctx.fill();

    // Sneakers
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-5.5 * scale, (23 + legSwing * 0.3) * scale, 5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(5.5 * scale, (23 - legSwing * 0.3) * scale, 5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute hoodie / varsity body
    ctx.fillStyle = isGirl ? '#7c3aed' : '#6d28d9';
    ctx.strokeStyle = '#23103a';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.roundRect(-14 * scale, -4 * scale, 28 * scale, 20 * scale, 9 * scale);
    ctx.fill();
    ctx.stroke();

    // Orange & turquoise outfit stripe
    ctx.fillStyle = isGirl ? '#e85d24' : '#328990';
    ctx.fillRect(-12 * scale, 7 * scale, 24 * scale, 5 * scale);

    // Optional waving purple lightstick in right hand
    if (opts.hasLightstick) {
      const wave = Math.sin(t * 8) * 0.25;
      ctx.save();
      ctx.translate(15 * scale, 2 * scale);
      ctx.rotate(wave);
      ctx.strokeStyle = '#1f1035';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 4 * scale);
      ctx.lineTo(4 * scale, -12 * scale);
      ctx.stroke();

      // Lightstick glow halo
      const grad = ctx.createRadialGradient(5 * scale, -15 * scale, 1, 5 * scale, -15 * scale, 14 * scale);
      grad.addColorStop(0, 'rgba(233, 213, 255, 0.95)');
      grad.addColorStop(0.45, 'rgba(167, 139, 250, 0.65)');
      grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(5 * scale, -15 * scale, 14 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f5f3ff';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.arc(5 * scale, -15 * scale, 5.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Chibi Head portrait circle using our generated illustration (with vector fallback!)
    const headR = 19 * scale;
    const headY = -18 * scale;

    if (opts.avatarAsset?.img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        opts.avatarAsset.img,
        -headR * 1.15,
        headY - headR * 1.08,
        headR * 2.3,
        headR * 2.3
      );
      ctx.restore();

      // Clean outline ring around head
      ctx.strokeStyle = '#240f42';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Pure vector cute chibi head fallback
      ctx.fillStyle = '#ffe0c8';
      ctx.strokeStyle = '#240f42';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair
      ctx.fillStyle = '#432818';
      ctx.beginPath();
      ctx.arc(0, headY - 4 * scale, headR, Math.PI, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#240f42';
      ctx.beginPath();
      ctx.arc(-6 * scale, headY + 1 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.arc(6 * scale, headY + 1 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#240f42';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.arc(0, headY + 4 * scale, 4 * scale, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // "BITIES" purple headband across forehead
    if (opts.wearsHeadband) {
      ctx.save();
      ctx.fillStyle = '#6d28d9';
      ctx.strokeStyle = '#f5f3ff';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.roundRect(-16 * scale, headY - 12 * scale, 32 * scale, 8.5 * scale, 4 * scale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.round(6.8 * scale)}px "Fredoka", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BITIES', 0, headY - 7.5 * scale);
      ctx.restore();
    }
  }

  // Optional player nameplate below shadow
  if (opts.label) {
    ctx.font = `700 ${Math.round(11 * scale)}px "Plus Jakarta Sans", sans-serif`;
    const textW = ctx.measureText(opts.label).width;
    ctx.fillStyle = 'rgba(26, 11, 52, 0.82)';
    ctx.beginPath();
    ctx.roundRect(-textW / 2 - 8, 28 * scale, textW + 16, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.label, 0, 28 * scale + 9);
  }

  ctx.restore();
}

/**
 * Draws a friendly ARMY fan NPC on the street march (supports /assets/npc-army.png).
 */
export function drawArmyFanNpc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  variant: number,
  npcAsset?: LoadedAsset,
  recruited = false
): void {
  const bob = Math.abs(Math.sin(time * 9 + variant * 1.7)) * (recruited ? 4.5 : 2.5);
  ctx.save();
  ctx.translate(x, y);

  // Soft shadow
  ctx.fillStyle = 'rgba(20, 8, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 19, 14, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);

  // Welcoming purple aura when waiting to be recruited
  if (!recruited) {
    const pulse = 0.75 + Math.sin(time * 5 + variant) * 0.25;
    ctx.strokeStyle = `rgba(196, 181, 253, ${0.85 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (npcAsset?.img) {
    ctx.drawImage(npcAsset.img, -22, -26, 44, 48);
  } else {
    const shirtPalette = ['#7c3aed', '#328990', '#e85d24', '#9333ea'];
    const hairPalette = ['#3b2216', '#1f1726', '#5c3317', '#2b1d14'];
    const shirt = shirtPalette[variant % shirtPalette.length];
    const hair = hairPalette[variant % hairPalette.length];

    // Body
    ctx.fillStyle = shirt;
    ctx.strokeStyle = '#240f42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-11, -2, 22, 18, 7);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = '#ffe0c4';
    ctx.beginPath();
    ctx.arc(0, -13, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair cap
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(0, -16, 13, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();

    // Purple headband
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(-11, -20, 22, 4.5);

    // Eyes & happy mouth
    ctx.fillStyle = '#240f42';
    ctx.beginPath();
    ctx.arc(-4.5, -11.5, 1.9, 0, Math.PI * 2);
    ctx.arc(4.5, -11.5, 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#240f42';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -9.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Mini lightstick
    ctx.fillStyle = '#e9d5ff';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(14, -10, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (!recruited) {
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.roundRect(-24, -41, 48, 15, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ ARMY', 0, -33.5);
  }

  ctx.restore();
}

/**
 * Draws the slow, easy-to-dodge "Fake News" obstacle (supports /assets/obstacle-fake.png).
 */
export function drawFakeNewsObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  obstacleAsset?: LoadedAsset
): void {
  const wobble = Math.sin(time * 4.5) * 0.08;
  ctx.save();
  ctx.translate(x, y);

  // Telegraph shadow ring on street
  ctx.fillStyle = 'rgba(232, 93, 36, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 25, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(wobble);

  if (obstacleAsset?.img) {
    ctx.drawImage(obstacleAsset.img, -28, -28, 56, 56);
  } else {
    // Comical grumpy rumor cloud / fake newspaper card
    ctx.fillStyle = '#fff1f2';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.roundRect(-26, -20, 52, 38, 10);
    ctx.fill();
    ctx.stroke();

    // Red top newspaper banner
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(-26, -20, 52, 13, [10, 10, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 8px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FAKE NEWS', 0, -13.5);

    // Silly squiggly rumor lines + grumpy eyes
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(-8, 2, 2.2, 0, Math.PI * 2);
    ctx.arc(8, 2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Angry brows
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, -3);
    ctx.lineTo(-4, 0);
    ctx.moveTo(12, -3);
    ctx.lineTo(4, 0);
    ctx.stroke();

    // Zigzag mouth
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-3, 7);
    ctx.lineTo(3, 10);
    ctx.lineTo(8, 7);
    ctx.stroke();
  }

  ctx.restore();
}

export type CanvasCollectibleKind = ChecklistItemId | 'ticket' | 'decoy-pan' | 'decoy-remote';

/**
 * Draws one of the 4 survival checklist items, the golden 5th item (La Entrada),
 * or funny room decoy items on canvas.
 */
export function drawCollectibleItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  itemId: CanvasCollectibleKind,
  label: string,
  time: number,
  asset?: LoadedAsset
): void {
  const isTicket = itemId === 'ticket';
  const floatY = Math.sin(time * (isTicket ? 5 : 3.6) + x * 0.05) * (isTicket ? 6 : 4);
  const pulse = 0.85 + Math.sin(time * (isTicket ? 6 : 4)) * 0.15;

  ctx.save();
  ctx.translate(x, y);

  // Soft ground shadow
  ctx.fillStyle = isTicket ? 'rgba(245, 158, 11, 0.35)' : 'rgba(28, 11, 56, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 20, isTicket ? 24 : 18, isTicket ? 8 : 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, floatY);

  // Glowing halo
  const haloR = (isTicket ? 42 : 29) * pulse;
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, haloR);
  if (isTicket) {
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  } else {
    grad.addColorStop(0, 'rgba(233, 213, 255, 0.9)');
    grad.addColorStop(0.55, 'rgba(139, 92, 246, 0.38)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Backing medallion for crystal-clear visibility over detailed room floor
  ctx.fillStyle = isTicket ? '#fffbeb' : '#ffffff';
  ctx.strokeStyle = isTicket ? '#f59e0b' : '#7c3aed';
  ctx.lineWidth = isTicket ? 3.2 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, isTicket ? 24 : 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (asset?.img) {
    const s = isTicket ? 34 : 28;
    ctx.drawImage(asset.img, -s / 2, -s / 2, s, s);
  } else {
    drawVectorItemIcon(ctx, itemId);
  }

  // Clear, high-contrast label underneath
  ctx.font = `700 ${isTicket ? 12 : 11}px "Plus Jakarta Sans", sans-serif`;
  const tw = ctx.measureText(label).width;
  const padX = 8;
  const pillY = isTicket ? 27 : 22;
  ctx.fillStyle = isTicket ? '#b45309' : 'rgba(27, 11, 56, 0.88)';
  ctx.beginPath();
  ctx.roundRect(-tw / 2 - padX, pillY, tw + padX * 2, 19, 9);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, pillY + 9.5);

  ctx.restore();
}

function drawVectorItemIcon(ctx: CanvasRenderingContext2D, itemId: CanvasCollectibleKind): void {
  ctx.save();
  if (itemId === 'lightstick') {
    // Army Bomb / Lightstick
    ctx.strokeStyle = '#240f42';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(0, 14);
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.strokeStyle = '#6d28d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -3, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e85d24';
    ctx.beginPath();
    ctx.arc(0, -11, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'tshirt') {
    // Purple concert T-shirt
    ctx.fillStyle = '#7c3aed';
    ctx.strokeStyle = '#240f42';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.lineTo(-13, -4);
    ctx.lineTo(-9, 1);
    ctx.lineTo(-7, -1);
    ctx.lineTo(-7, 11);
    ctx.lineTo(7, 11);
    ctx.lineTo(7, -1);
    ctx.lineTo(9, 1);
    ctx.lineTo(13, -4);
    ctx.lineTo(6, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heart emblem on shirt
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 1, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'powerbank') {
    // Turquoise portable battery pack
    ctx.fillStyle = '#328990';
    ctx.strokeStyle = '#1b0b38';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-8, -10, 16, 21, 4);
    ctx.fill();
    ctx.stroke();

    // Lightning bolt
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(2, -6);
    ctx.lineTo(-4, 1);
    ctx.lineTo(0, 1);
    ctx.lineTo(-2, 7);
    ctx.lineTo(4, -1);
    ctx.lineTo(0, -1);
    ctx.closePath();
    ctx.fill();
  } else if (itemId === 'bandana') {
    // Purple BITIES headband with tails
    ctx.fillStyle = '#6d28d9';
    ctx.strokeStyle = '#240f42';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-12, -6, 24, 10, 5);
    ctx.fill();
    ctx.stroke();

    // Flowing ribbon tails
    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.lineTo(13, 11);
    ctx.lineTo(7, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 6px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BITIES', 0, -1);
  } else if (itemId === 'decoy-pan') {
    // Silly frying pan with fried egg (not for a concert!)
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(12, 12);
    ctx.stroke();

    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-2, -2, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mini fried egg inside pan
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-2, -2, 5.5, 4.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-2, -2, 2.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'decoy-remote') {
    // TV Remote Control (not for a concert!)
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-6.5, -11, 13, 22, 4);
    ctx.fill();
    ctx.stroke();

    // Red power button
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-2.5, -7, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Number buttons
    ctx.fillStyle = '#cbd5e1';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillRect(-3.5 + c * 4.5, -2 + r * 4, 2.5, 2.2);
      }
    }
  } else {
    // Golden Concert Ticket (La Entrada)
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -9, 28, 18, 4);
    ctx.fill();
    ctx.stroke();

    // Ticket notches
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(-14, 0, 3.2, 0, Math.PI * 2);
    ctx.arc(14, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner star
    ctx.fillStyle = '#fef9c3';
    ctx.font = '800 11px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VIP', 0, 0.5);
  }
  ctx.restore();
}
