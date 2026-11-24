import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { KEY_VISUAL_IMAGE } from '../game/characters';
import type { BestRecord } from '../game/types';

interface TitleScreenProps {
  bestRecord: BestRecord | null;
  muted: boolean;
  onToggleMute: () => void;
  onStartSelect: () => void;
  onBackToHub?: () => void;
}

export function TitleScreen({
  bestRecord,
  muted,
  onToggleMute,
  onStartSelect,
  onBackToHub,
}: TitleScreenProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartSelect]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto px-5 py-4 md:px-8 md:py-5">
      {/* Top quiet utility row: hub back button + sound toggle */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="cel-box-sm flex h-9 items-center gap-1.5 bg-[#091b33] px-3 text-xs font-bold text-amber-300 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              ← Volver al inicio
            </button>
          )}
          <div className="text-xs font-semibold tracking-wider text-cyan-200/85 hidden sm:block">
            EDICIÓN OPENING ANIME · ACCIÓN SUBMARINA 2D
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
          className="cel-box-sm flex h-10 w-10 items-center justify-center bg-[#091b33] text-cyan-300 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Main split hero — compactly scaled so 100% fits cleanly on 1280x680 / 1366x768 laptops at 100% zoom */}
      <div className="mx-auto my-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 py-3 lg:grid-cols-12">
        <div className="flex flex-col items-start gap-4 lg:col-span-7">
          {/* Bespoke inline SVG Cel-Shaded Title Lockup */}
          <div className="w-full max-w-md xl:max-w-lg">
            <svg
              viewBox="0 0 640 198"
              className="h-auto w-full overflow-visible"
              role="img"
              aria-label="Los Perdidos: Suiatsu"
            >
              <defs>
                <linearGradient id="suiatsuFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#e0f2fe" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <polygon
                points="8,112 612,86 600,120 0,142"
                fill="#00d4ff"
                stroke="#050811"
                strokeWidth="4"
              />
              <text
                x="14"
                y="58"
                fontFamily="Antonio, sans-serif"
                fontWeight="700"
                fontSize="52"
                letterSpacing="5"
                fill="#050811"
                stroke="#050811"
                strokeWidth="12"
                strokeLinejoin="round"
              >
                LOS PERDIDOS
              </text>
              <text
                x="14"
                y="58"
                fontFamily="Antonio, sans-serif"
                fontWeight="700"
                fontSize="52"
                letterSpacing="5"
                fill="#fde047"
              >
                LOS PERDIDOS
              </text>
              <text
                x="12"
                y="168"
                fontFamily="Antonio, sans-serif"
                fontWeight="700"
                fontSize="122"
                letterSpacing="8"
                fill="#050811"
                stroke="#050811"
                strokeWidth="22"
                strokeLinejoin="round"
              >
                SUIATSU
              </text>
              <text
                x="12"
                y="168"
                fontFamily="Antonio, sans-serif"
                fontWeight="700"
                fontSize="122"
                letterSpacing="8"
                fill="#00f0ff"
                stroke="#00f0ff"
                strokeWidth="10"
                strokeLinejoin="round"
              >
                SUIATSU
              </text>
              <text
                x="12"
                y="168"
                fontFamily="Antonio, sans-serif"
                fontWeight="700"
                fontSize="122"
                letterSpacing="8"
                fill="url(#suiatsuFill)"
              >
                SUIATSU
              </text>
            </svg>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-slate-200/95 md:text-[15px]">
            Un terremoto submarino separa a los 8 integrantes en el abismo. Rescata al equipo,
            encadena combos al ritmo y vence al Núcleo del Terremoto.
          </p>

          {/* Primary Play CTA sits prominently BEFORE controls so it is never pushed off-screen */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onStartSelect}
              className="cel-box-cyan bg-[#00f0ff] px-8 py-3 font-display text-2xl font-bold tracking-wider text-[#050811] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#67e8f9] active:translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              JUGAR AHORA
            </button>

            {bestRecord && (
              <div className="flex items-center gap-2.5 text-sm text-cyan-100/90">
                <span className="text-slate-400">Récord</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num font-bold text-amber-300">
                  {bestRecord.bestScore.toLocaleString('es-CL')} pts
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-display text-lg font-bold text-cyan-300">
                  Rango {bestRecord.bestRank}
                </span>
              </div>
            )}
          </div>

          {/* Compact Cel-Shaded Controls Guide — clean spacing, never overlaps button */}
          <div className="cel-box-sm w-full max-w-lg bg-[#061428]/95 px-4 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-display text-xs font-bold tracking-wider text-cyan-300">
                CÓMO JUGAR · CONTROLES
              </span>
              <span className="text-[11px] text-cyan-200/75">
                Celular: Joystick + Botones táctiles
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <kbd className="cel-box-sm shrink-0 bg-[#0d2545] px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-white">
                  WASD / Flechas
                </kbd>
                <span className="truncate text-slate-200">Mover</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="cel-box-sm shrink-0 bg-[#0d2545] px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-[#00f0ff]">
                  Espacio
                </kbd>
                <span className="truncate text-slate-200">Ataque básico</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="cel-box-sm shrink-0 bg-[#0d2545] px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-amber-300">
                  Shift / E
                </kbd>
                <span className="truncate text-slate-200">Especial</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="cel-box-sm shrink-0 bg-[#0d2545] px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-slate-200">
                  Esc
                </kbd>
                <span className="truncate text-slate-200">Pausa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Showcase: Uploaded Group Key Visual scaled cleanly to viewport height */}
        <div className="hidden lg:col-span-5 lg:flex lg:justify-end">
          <div className="cel-box relative w-full max-w-[350px] overflow-hidden bg-[#061830] p-2">
            <img
              src={KEY_VISUAL_IMAGE}
              alt="Los Perdidos: Suiatsu — Key Visual de los 8 integrantes"
              referrerPolicy="no-referrer"
              className="max-h-[62vh] w-full object-contain bg-gradient-to-b from-cyan-50 via-sky-100 to-cyan-900"
            />
          </div>
        </div>
      </div>

      {/* Single flat footer hint line */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-cyan-400/20 pt-2.5 text-xs font-medium text-cyan-100/80">
        <div>
          Rescata a los 7 integrantes, junta perlas luminosas y derrota al Núcleo del Terremoto.
        </div>
        <div className="text-cyan-300/80">Presiona Enter o Espacio para comenzar</div>
      </div>
    </div>
  );
}
