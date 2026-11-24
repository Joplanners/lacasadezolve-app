import { useEffect, useState } from 'react';
import { ChevronRight, Monitor, AlertTriangle } from 'lucide-react';
import { loadAsset, type LoadedAsset } from '../game/assets';
import { soundEngine } from '../game/sound';
import type { PlayerProfile } from '../game/types';
import { ChibiAvatar } from './ChibiAvatar';

interface Phase1IntroProps {
  profile: PlayerProfile;
  onComplete: () => void;
}

type IntroScene = 1 | 2 | 3;

export function Phase1Intro({ profile, onComplete }: Phase1IntroProps) {
  const [scene, setScene] = useState<IntroScene>(1);
  const [ticketBought, setTicketBought] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [roomAsset, setRoomAsset] = useState<LoadedAsset | null>(null);

  useEffect(() => {
    let active = true;
    loadAsset('bg-room').then((loaded) => {
      if (active) setRoomAsset(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Scene 1: Sitting at computer -> "¡ENTRADA COMPRADA!" -> Jump for joy -> auto-advance
  useEffect(() => {
    if (scene !== 1) return;
    soundEngine.setTrack('title');
    setTicketBought(false);

    const t1 = window.setTimeout(() => {
      setTicketBought(true);
      soundEngine.playPickup();
    }, 1500);

    const t2 = window.setTimeout(() => {
      setScene(2);
    }, 5800);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [scene]);

  // Scene 2: Dramatic black transition & alert -> auto-advance
  useEffect(() => {
    if (scene !== 2) return;
    soundEngine.setTrack('alert');
    soundEngine.playAlert();

    const t = window.setTimeout(() => {
      setScene(3);
    }, 5000);

    return () => window.clearTimeout(t);
  }, [scene]);

  // Scene 3: Put on purple "BITIES" headband, pull out phone, visual 3 - 2 - 1 countdown
  useEffect(() => {
    if (scene !== 3) return;
    soundEngine.setTrack('mission');
    setCountdown(3);
    soundEngine.playCountdown(3);

    const t1 = window.setTimeout(() => {
      setCountdown(2);
      soundEngine.playCountdown(2);
    }, 1300);

    const t2 = window.setTimeout(() => {
      setCountdown(1);
      soundEngine.playCountdown(1);
    }, 2600);

    const t3 = window.setTimeout(() => {
      setCountdown(0);
      soundEngine.playCountdown(0);
    }, 3900);

    const t4 = window.setTimeout(() => {
      onComplete();
    }, 4550);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [scene, onComplete]);

  const handleNext = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    if (scene === 1) {
      if (!ticketBought) {
        setTicketBought(true);
        soundEngine.playPickup();
      } else {
        setScene(2);
      }
    } else if (scene === 2) {
      setScene(3);
    } else {
      onComplete();
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#160830]">
      {/* SCENE 1: Cozy Bedroom + Ticket Purchased (Zero Layout Shift) */}
      {scene === 1 && (
        <div className="relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {roomAsset?.src ? (
            <div className="absolute inset-0 overflow-hidden bg-[#271547]">
              <img
                src={roomAsset.src}
                alt="Habitación acogedora"
                referrerPolicy="no-referrer"
                className={
                  roomAsset.cropTopHalf
                    ? 'w-full h-[200%] object-cover object-top'
                    : 'w-full h-full object-cover object-center'
                }
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#4c1d95] via-[#311564] to-[#1e0c42]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a38]/80 via-[#1a0a38]/25 to-[#1a0a38]/94" />

          {/* Top Date Banner (fixed shrink-0) */}
          <div className="relative z-10 shrink-0 pt-14 px-4 flex justify-center">
            <div className="bg-[#fffaf3] text-[#1f0d3e] px-4 py-2 rounded-2xl border-2 border-[#328990] shadow-lg text-center">
              <p className="font-display font-bold text-sm sm:text-base leading-snug">
                Marzo 2026 - Día de Venta de Entradas
              </p>
            </div>
          </div>

          {/* Center Character + Reserved Banner Slot (prevents bottom button shift) */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 gap-3">
            {/* Fixed-height reserved slot so "¡ENTRADA COMPRADA!" never pushes layout */}
            <div className="h-[56px] flex items-center justify-center shrink-0">
              <div
                aria-hidden={!ticketBought}
                className={`bg-[#e85d24] text-white px-5 py-2.5 rounded-2xl border-2 border-[#fde047] shadow-[0_10px_28px_rgba(232,93,36,0.55)] text-center transition-all duration-300 ${
                  ticketBought
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-90 pointer-events-none'
                }`}
              >
                <p className="font-display font-bold text-xl sm:text-2xl tracking-wide leading-none">
                  ¡ENTRADA COMPRADA!
                </p>
              </div>
            </div>

            <div className="relative flex flex-col items-center">
              <ChibiAvatar
                avatar={profile.avatar}
                size="lg"
                jumping={ticketBought}
              />

              {/* Cute glowing computer screen in front of the player */}
              <div className="mt-2.5 flex items-center gap-2 bg-[#1c0c38]/92 border-2 border-[#a78bfa] rounded-xl px-4 py-2 shadow-lg">
                <Monitor className="w-5 h-5 text-[#46a8b0] shrink-0" />
                <span className="text-sm font-bold text-[#f5f3ff]">
                  {ticketBought ? 'Ticket Confirmado ✓' : 'Fila virtual en progreso...'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Dialogue Card + Always-Visible Siguiente Button */}
          <div className="relative z-10 shrink-0 px-4 pb-4 flex flex-col gap-2.5">
            <div className="bg-[#fffaf3] text-[#1c0c38] rounded-2xl px-4 py-3 shadow-xl border-2 border-[#c4b5fd] min-h-[76px] flex items-center justify-center">
              <p className="text-sm sm:text-base font-semibold leading-snug text-center">
                {ticketBought
                  ? `¡Sí, ${profile.name}! Después de tanta espera, por fin tienes tu entrada para ver a BITIES en Chile.`
                  : `${profile.name} espera con el corazón acelerado frente al computador...`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-[#328990] hover:bg-[#3c9da5] active:scale-[0.98] text-white font-display font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* SCENE 2: Dramatic Black Alert */}
      {scene === 2 && (
        <div className="relative flex-1 min-h-0 flex flex-col justify-between bg-[#090410] px-4 pt-14 pb-4 overflow-hidden">
          <div
            className="absolute inset-0 animate-alert-pulse pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, rgba(220,38,38,0.18) 0%, rgba(127,29,29,0.55) 100%)',
            }}
          />

          <div className="relative z-10 shrink-0 flex flex-col items-center text-center mt-2">
            <div className="w-14 h-14 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center shadow-[0_0_28px_rgba(220,38,38,0.75)] mb-2">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <p className="font-display font-bold text-2xl sm:text-3xl text-[#fca5a5] tracking-wider">
              ¡ALERTA!
            </p>
          </div>

          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-4 my-2">
            <div className="bg-[#1c0912] border-2 border-[#ef4444] rounded-2xl px-5 py-4 shadow-2xl text-center max-w-[350px]">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white leading-snug text-balance">
                ¡ALERTA! Rumores de cancelación del concierto
              </h2>
            </div>

            <ChibiAvatar avatar={profile.avatar} size="lg" />

            <p className="text-sm sm:text-base text-[#f3e8ff] text-center max-w-[320px] leading-relaxed">
              Las redes sociales se llenan de preocupación... ¡No podemos quedarnos de brazos cruzados!
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-[#e85d24] hover:bg-[#f06932] active:scale-[0.98] text-white font-display font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* SCENE 3: Purple "BITIES" Headband + Phone + Visual 3 - 2 - 1 Countdown */}
      {scene === 3 && (
        <div className="relative flex-1 min-h-0 flex flex-col justify-between px-4 pt-14 pb-4 overflow-hidden bg-gradient-to-b from-[#3b1578] via-[#270e54] to-[#170834]">
          <div
            className="absolute inset-0 pointer-events-none opacity-45"
            style={{
              background:
                'radial-gradient(circle at 50% 44%, rgba(167,139,250,0.55) 0%, rgba(50,137,144,0.2) 45%, transparent 72%)',
            }}
          />

          <div className="relative z-10 shrink-0 text-center">
            <p className="font-display font-bold text-2xl text-[#fde047] drop-shadow">
              ¡Modo Misión Activado!
            </p>
            <p className="text-sm sm:text-base text-[#e9d5ff] mt-1">
              {profile.name} se pone la cinta morada y saca su celular
            </p>
          </div>

          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-5">
            <ChibiAvatar
              avatar={profile.avatar}
              size="lg"
              wearsHeadband
              holdingPhone
            />

            {/* Visual Countdown 3 - 2 - 1 */}
            <div className="flex items-center gap-4">
              {[3, 2, 1].map((n) => {
                const isActive = countdown === n;
                const isPast = countdown < n;
                return (
                  <div
                    key={n}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-mono-num font-bold text-3xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-[#e85d24] text-white scale-115 shadow-[0_0_28px_rgba(232,93,36,0.75)] ring-4 ring-[#fde047]'
                        : isPast
                          ? 'bg-[#328990]/40 text-white/60 scale-95'
                          : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-[#328990] hover:bg-[#3c9da5] active:scale-[0.98] text-white font-display font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Siguiente · Ir a Misión 1</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
