/**
 * Misión BITIES: Rumbo al Estadio
 * Minijuego web 2D interactivo estilo RPG casual — Regalo navideño de La Casa de Zolve
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { preloadCoreAssets } from './game/assets';
import { soundEngine } from './game/sound';
import type { GamePhase, GameStats, PlayerProfile } from './game/types';
import { Phase0Select } from './components/Phase0Select';
import { Phase1Intro } from './components/Phase1Intro';
import { Phase2SocialWave } from './components/Phase2SocialWave';
import { Phase3StreetMarch } from './components/Phase3StreetMarch';
import { Phase4RoomChecklist } from './components/Phase4RoomChecklist';
import { Phase5StadiumFinale } from './components/Phase5StadiumFinale';

const PHASE_META: Record<GamePhase, string> = {
  SELECT: 'La Casa de Zolve',
  INTRO: 'Historia · Marzo 2026',
  SOCIAL_WAVE: 'Misión 1 / 3',
  STREET_MARCH: 'Misión 2 / 3',
  ROOM_CHECKLIST: 'Misión 3 / 3',
  STADIUM_FINALE: 'Gran Final',
};

interface BitiesAppProps {
  onBackToHub?: () => void;
}

export default function BitiesApp({ onBackToHub }: BitiesAppProps) {
  const [phase, setPhase] = useState<GamePhase>('SELECT');
  const [profile, setProfile] = useState<PlayerProfile>({
    name: '',
    avatar: 'girl',
  });
  const [stats, setStats] = useState<GameStats>({
    messagesSent: 10,
    fansRecruited: 0,
    itemsCollected: 5,
  });
  const [muted, setMuted] = useState(false);

  // Preload custom /assets/* or generated fallback illustrations on mount
  useEffect(() => {
    void preloadCoreAssets();
    return () => {
      soundEngine.setTrack('none');
    };
  }, []);

  // Sync title music when on the welcome screen
  useEffect(() => {
    if (phase === 'SELECT') {
      soundEngine.setTrack('title');
    }
  }, [phase]);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  };

  const handleStartAdventure = useCallback((nextProfile: PlayerProfile) => {
    setProfile(nextProfile);
    setStats({ messagesSent: 0, fansRecruited: 0, itemsCollected: 0 });
    setPhase('INTRO');
  }, []);

  const handleIntroComplete = useCallback(() => {
    setPhase('SOCIAL_WAVE');
  }, []);

  const handleSocialComplete = useCallback((messagesSent: number) => {
    setStats((prev) => ({ ...prev, messagesSent }));
    setPhase('STREET_MARCH');
  }, []);

  const handleStreetComplete = useCallback((fansRecruited: number) => {
    setStats((prev) => ({ ...prev, fansRecruited }));
    setPhase('ROOM_CHECKLIST');
  }, []);

  const handleChecklistComplete = useCallback(() => {
    setStats((prev) => ({ ...prev, itemsCollected: 5 }));
    setPhase('STADIUM_FINALE');
  }, []);

  const handleReplay = useCallback(() => {
    setStats({ messagesSent: 0, fansRecruited: 0, itemsCollected: 0 });
    setPhase('SELECT');
  }, []);

  return (
    <main className="relative w-full h-[100dvh] flex items-center justify-center overflow-hidden bg-[#14072b]">
      {/* Atmospheric Desktop Surround (soft purple, turquoise & orange concert glow) */}
      <div
        className="hidden sm:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 25%, rgba(124,58,237,0.38) 0%, transparent 48%), radial-gradient(circle at 82% 20%, rgba(50,137,144,0.32) 0%, transparent 45%), radial-gradient(circle at 50% 90%, rgba(232,93,36,0.24) 0%, transparent 50%), linear-gradient(180deg, #170833 0%, #0e0421 100%)',
        }}
      />

      {/* Adaptive Vertical Mobile-First Game Stage */}
      <section
        aria-label="Escenario del juego Misión BITIES: Rumbo al Estadio"
        className="relative w-full h-full sm:max-w-[440px] sm:h-[min(94dvh,850px)] sm:rounded-[28px] overflow-hidden bg-[#1a0a36] sm:border sm:border-white/15 sm:shadow-[0_24px_72px_rgba(7,2,18,0.85)]"
      >
        {/* Top Unobtrusive Overlay Bar (Hub back button + Phase label + >= 48px Mute Button) */}
        <div className="pointer-events-none absolute top-0 inset-x-0 z-40 flex items-center justify-between px-3.5 pt-2">
          <div className="flex items-center gap-2">
            {onBackToHub && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.setTrack('none');
                  onBackToHub();
                }}
                className="pointer-events-auto h-8 px-2.5 rounded-xl bg-[#1b0b38]/85 hover:bg-[#2a1257] active:scale-95 border border-[#fde047]/50 text-white text-[11px] font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
                <span>Volver al inicio</span>
              </button>
            )}
            <span className="text-xs font-bold tracking-wide text-white/90 drop-shadow-[0_2px_6px_rgba(12,4,28,0.95)] pl-1">
              {PHASE_META[phase]}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Activar música y sonidos' : 'Silenciar música y sonidos'}
            title={muted ? 'Activar música' : 'Silenciar música'}
            className="pointer-events-auto w-12 h-12 rounded-2xl bg-[#1b0b38]/75 hover:bg-[#2a1257]/90 active:scale-95 border border-white/25 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fde047]"
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-[#fda4af]" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#fde047]" />
            )}
          </button>
        </div>

        {/* Active Phase View */}
        {phase === 'SELECT' && (
          <Phase0Select initialProfile={profile} onStart={handleStartAdventure} />
        )}

        {phase === 'INTRO' && (
          <Phase1Intro profile={profile} onComplete={handleIntroComplete} />
        )}

        {phase === 'SOCIAL_WAVE' && (
          <Phase2SocialWave profile={profile} onComplete={handleSocialComplete} />
        )}

        {phase === 'STREET_MARCH' && (
          <Phase3StreetMarch profile={profile} onComplete={handleStreetComplete} />
        )}

        {phase === 'ROOM_CHECKLIST' && (
          <Phase4RoomChecklist profile={profile} onComplete={handleChecklistComplete} />
        )}

        {phase === 'STADIUM_FINALE' && (
          <Phase5StadiumFinale
            profile={profile}
            stats={stats}
            onReplay={handleReplay}
          />
        )}
      </section>
    </main>
  );
}
