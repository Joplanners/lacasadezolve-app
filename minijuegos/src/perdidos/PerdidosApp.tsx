import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { EndingOverlay } from './components/EndingOverlay';
import { GameHud } from './components/GameHud';
import { TitleScreen } from './components/TitleScreen';
import { audioEngine } from './game/audio';
import type { MemberId } from './game/characters';
import { SuiatsuGameEngine } from './game/engine';
import {
  loadBestRecord,
  saveBestRecord,
  type BestRecord,
  type CutInEvent,
  type HudSnapshot,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  screen: 'TITLE_MENU',
  act: 'INTRO',
  selectedMemberId: 'chan',
  hp: 110,
  maxHp: 110,
  pressure: 0,
  timeLeft: 165,
  timeFrozen: false,
  specialCharge: 45,
  specialActiveTimer: 0,
  shieldHits: 0,
  pearls: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  epicCombos: 0,
  beatPulse: 0,
  rescuedIds: [],
  trappedIds: [],
  bossActive: false,
  bossHp: 1600,
  bossMaxHp: 1600,
  bossName: 'El Núcleo del Terremoto',
  introCaption: '',
  endingTime: 0,
  gameOverReason: '',
  scoreBreakdown: null,
};

function detectTouchPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    window.innerWidth < 900
  );
}

interface PerdidosAppProps {
  onBackToHub?: () => void;
}

export default function PerdidosApp({ onBackToHub }: PerdidosAppProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SuiatsuGameEngine | null>(null);
  const cutInTimeoutRef = useRef<number | null>(null);

  const [selectedId, setSelectedId] = useState<MemberId>('chan');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [cutIn, setCutIn] = useState<CutInEvent | null>(null);
  const [muted, setMuted] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState<boolean>(() => detectTouchPreferred());
  const [bestRecord, setBestRecord] = useState<BestRecord | null>(() => loadBestRecord());

  // Automatically adapt touch controls when resizing between desktop/mobile or on first touch
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 900) {
        setTouchEnabled(true);
      }
    };
    const onFirstTouch = () => {
      setTouchEnabled(true);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('touchstart', onFirstTouch);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SuiatsuGameEngine(canvas, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
        if (
          (snapshot.screen === 'VICTORY_FREEZE' ||
            snapshot.screen === 'VICTORY' ||
            snapshot.screen === 'GAME_OVER') &&
          snapshot.scoreBreakdown
        ) {
          const updated = saveBestRecord(
            snapshot.scoreBreakdown.totalScore,
            snapshot.scoreBreakdown.rank,
            snapshot.selectedMemberId
          );
          setBestRecord(updated);
        }
      },
      onCutIn: (event) => {
        setCutIn(event);
        if (cutInTimeoutRef.current !== null) {
          window.clearTimeout(cutInTimeoutRef.current);
        }
        cutInTimeoutRef.current = window.setTimeout(() => {
          setCutIn(null);
        }, 1800);
      },
      onScreenChange: () => {
        // Screen state syncs immediately through onHudUpdate
      },
    });

    engineRef.current = engine;
    engine.startLoop();

    return () => {
      if (cutInTimeoutRef.current !== null) {
        window.clearTimeout(cutInTimeoutRef.current);
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleTouch = useCallback(() => {
    setTouchEnabled((prev) => {
      if (prev) {
        engineRef.current?.setVirtualMove(0, 0);
      }
      return !prev;
    });
  }, []);

  const handleOpenSelect = useCallback(() => {
    audioEngine.unlock();
    engineRef.current?.setScreenMode('CHAR_SELECT');
  }, []);

  const handleBackToTitle = useCallback(() => {
    engineRef.current?.setScreenMode('TITLE_MENU');
  }, []);

  const handleStartMission = useCallback((id: MemberId) => {
    setSelectedId(id);
    setCutIn(null);
    engineRef.current?.startNewGame(id);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.setPaused(false);
  }, []);

  const handleRestartSame = useCallback(() => {
    setCutIn(null);
    engineRef.current?.startNewGame(selectedId);
  }, [selectedId]);

  const handleSwitchMember = useCallback(() => {
    setCutIn(null);
    engineRef.current?.setScreenMode('CHAR_SELECT');
  }, []);

  const handleSkipIntro = useCallback(() => {
    engineRef.current?.skipIntro();
  }, []);

  const handleVirtualMove = useCallback((dx: number, dy: number) => {
    engineRef.current?.setVirtualMove(dx, dy);
  }, []);

  const handleTouchAttack = useCallback(() => {
    engineRef.current?.triggerTouchAction('ATTACK');
  }, []);

  const handleTouchSpecial = useCallback(() => {
    engineRef.current?.triggerTouchAction('SPECIAL');
  }, []);

  const handleShowScorecard = useCallback(() => {
    engineRef.current?.showVictoryScorecard();
  }, []);

  const handleShowKeyVisual = useCallback(() => {
    engineRef.current?.showVictoryFreeze();
  }, []);

  const showActiveHud =
    hud.screen === 'INTRO_QUAKE' ||
    hud.screen === 'PLAYING' ||
    hud.screen === 'PAUSED' ||
    hud.screen === 'ENDING_ASCENT';

  return (
    <main className="theme-suiatsu relative h-screen w-screen overflow-hidden bg-[#040914]">
      {/* Isolated full-viewport 60fps Cel-Shaded Game Canvas */}
      <div className="fixed inset-0 z-0">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {/* Screen 1: Full-Viewport Anime Title Screen */}
      {hud.screen === 'TITLE_MENU' && (
        <TitleScreen
          bestRecord={bestRecord}
          muted={muted}
          onToggleMute={handleToggleMute}
          onStartSelect={handleOpenSelect}
          onBackToHub={onBackToHub}
        />
      )}

      {/* Screen 2: 8-Member Character Selection */}
      {hud.screen === 'CHAR_SELECT' && (
        <CharacterSelect
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBack={handleBackToTitle}
          onStartMission={handleStartMission}
          onBackToHub={onBackToHub}
        />
      )}

      {/* Screen 3: Active Gameplay / Intro / Sakuga Ending Ascent HUD + Mobile Touch Controls */}
      {showActiveHud && (
        <GameHud
          hud={hud}
          cutIn={cutIn}
          muted={muted}
          touchEnabled={touchEnabled}
          onToggleMute={handleToggleMute}
          onToggleTouch={handleToggleTouch}
          onPause={handlePause}
          onSkipIntro={handleSkipIntro}
          onVirtualMove={handleVirtualMove}
          onTouchAttack={handleTouchAttack}
          onTouchSpecial={handleTouchSpecial}
          onBackToHub={onBackToHub}
        />
      )}

      {/* Screen 4: Pause, Full-Screen Key Visual Freeze Frame, Scorecard + Share & Game Over */}
      <EndingOverlay
        hud={hud}
        bestRecord={bestRecord}
        onResume={handleResume}
        onRestartSame={handleRestartSame}
        onSwitchMember={handleSwitchMember}
        onGoTitle={handleBackToTitle}
        onShowScorecard={handleShowScorecard}
        onShowKeyVisual={handleShowKeyVisual}
        onBackToHub={onBackToHub}
      />
    </main>
  );
}
