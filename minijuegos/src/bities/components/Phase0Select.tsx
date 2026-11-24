import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { loadAsset } from '../game/assets';
import { soundEngine } from '../game/sound';
import type { AvatarId, PlayerProfile } from '../game/types';
import { ChibiAvatar } from './ChibiAvatar';
import { TitleLockup } from './TitleLockup';

interface Phase0SelectProps {
  initialProfile: PlayerProfile;
  onStart: (profile: PlayerProfile) => void;
}

export function Phase0Select({ initialProfile, onStart }: Phase0SelectProps) {
  const [avatar, setAvatar] = useState<AvatarId>(initialProfile.avatar);
  const [name, setName] = useState(initialProfile.name);
  const [bgSrc, setBgSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAsset('bg-stadium').then((a) => {
      if (mounted && a.src) setBgSrc(a.src);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectAvatar = (next: AvatarId) => {
    soundEngine.unlock();
    soundEngine.playClick();
    setAvatar(next);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    soundEngine.unlock();
    soundEngine.playPickup();
    const cleaned = name.trim() || 'ARMY';
    onStart({ name: cleaned, avatar });
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#1e0b3d]">
      {/* Illustrated stadium key-art backdrop with calm contrast scrim */}
      {bgSrc && (
        <img
          src={bgSrc}
          alt="Estadio iluminado de morado"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-55 scale-[1.03]"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(25,10,54,0.72) 0%, rgba(36,14,76,0.58) 38%, rgba(22,9,46,0.92) 76%, rgba(18,7,38,0.98) 100%)',
        }}
      />

      {/* Foreground Content */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex-1 flex flex-col justify-between px-5 pt-14 pb-5 overflow-y-auto"
      >
        {/* Top Hero Lockup */}
        <div className="flex flex-col items-center gap-1.5">
          <TitleLockup />
          <p className="text-sm font-medium text-[#e9d5ff] tracking-wide text-center">
            Regalo navideño de La Casa de Zolve · Chile
          </p>
        </div>

        {/* Center Character Picker + Name Input */}
        <div className="w-full max-w-[380px] mx-auto flex flex-col gap-5 my-3">
          {/* Avatar Selection */}
          <div>
            <p className="text-center text-base font-bold text-white mb-3">
              Elige tu personaje
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              {(
                [
                  { id: 'girl' as const, label: 'Chica' },
                  { id: 'boy' as const, label: 'Chico' },
                ] as const
              ).map((option) => {
                const selected = avatar === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectAvatar(option.id)}
                    aria-pressed={selected}
                    className={`relative min-h-[136px] rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fde047] active:scale-95 cursor-pointer ${
                      selected
                        ? 'bg-[#fffaf3] text-[#1f0d3e] ring-4 ring-[#e85d24] shadow-[0_12px_28px_rgba(232,93,36,0.35)] scale-[1.02]'
                        : 'bg-[#2a1257]/80 text-[#e9d5ff] border border-white/20 hover:bg-[#35186b]/90'
                    }`}
                  >
                    {selected && (
                      <span
                        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#328990] text-white flex items-center justify-center shadow"
                        aria-hidden="true"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    )}
                    <ChibiAvatar avatar={option.id} size="md" />
                    <span className="font-display font-bold text-lg leading-none">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Large Accessible Name Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="player-name-input"
              className="text-base font-bold text-white pl-1"
            >
              ¿Cómo te llamas?
            </label>
            <input
              id="player-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 22))}
              placeholder="Escribe tu nombre aquí..."
              autoComplete="given-name"
              className="w-full min-h-[54px] px-4 rounded-xl bg-[#fffaf3] text-[#1c0c38] placeholder:text-[#7c6a99] text-lg font-semibold border-2 border-[#c4b5fd] focus:outline-none focus:border-[#328990] focus:ring-4 focus:ring-[#328990]/35 shadow-inner"
            />
          </div>
        </div>

        {/* Bottom Primary CTA + Clean Single-Line Hint */}
        <div className="w-full max-w-[380px] mx-auto flex flex-col gap-2.5">
          <button
            type="submit"
            className="w-full min-h-[56px] px-6 py-3.5 rounded-2xl bg-[#e85d24] hover:bg-[#f06932] active:scale-[0.98] text-white font-display font-bold text-xl tracking-wide shadow-[0_10px_26px_rgba(232,93,36,0.48)] border-b-4 border-[#b54213] transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fde047] cursor-pointer whitespace-nowrap"
          >
            ¡Comenzar Aventura!
          </button>
          <p className="text-center text-xs text-[#d8c7f5]/90">
            Toca en pantalla para jugar · Apto para todas las edades
          </p>
        </div>
      </form>
    </div>
  );
}
