import { Gamepad2, Pause, Volume2, VolumeX } from 'lucide-react';
import { getMemberById, MEMBERS } from '../game/characters';
import type { CutInEvent, HudSnapshot } from '../game/types';
import { TouchControls } from './TouchControls';

interface GameHudProps {
  hud: HudSnapshot;
  cutIn: CutInEvent | null;
  muted: boolean;
  touchEnabled: boolean;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onPause: () => void;
  onSkipIntro: () => void;
  onVirtualMove: (dx: number, dy: number) => void;
  onTouchAttack: () => void;
  onTouchSpecial: () => void;
  onBackToHub?: () => void;
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function GameHud({
  hud,
  cutIn,
  muted,
  touchEnabled,
  onToggleMute,
  onToggleTouch,
  onPause,
  onSkipIntro,
  onVirtualMove,
  onTouchAttack,
  onTouchSpecial,
  onBackToHub,
}: GameHudProps) {
  const playerMember = getMemberById(hud.selectedMemberId);
  const otherMembers = MEMBERS.filter((m) => m.id !== hud.selectedMemberId);
  const rescuedSet = new Set(hud.rescuedIds);

  // Intro Earthquake Caption HUD
  if (hud.screen === 'INTRO_QUAKE') {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-8">
        <div className="flex items-center justify-between">
          <div className="cel-box-sm bg-[#07162b] px-4 py-1.5 font-display text-lg font-bold tracking-wider text-amber-300">
            ACTO I · EL TERREMOTO COSTERO
          </div>
          <button
            type="button"
            onClick={onSkipIntro}
            className="pointer-events-auto cel-box-sm bg-[#0a1e38] px-4 py-2 text-xs font-bold tracking-wide text-cyan-200 hover:bg-[#112e54] whitespace-nowrap cursor-pointer"
          >
            Saltar Intro (Espacio)
          </button>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          <div className="cel-box bg-[#050c1a]/95 px-6 py-4 text-center">
            <p className="font-display text-xl font-bold tracking-wide text-white md:text-2xl">
              {hud.introCaption}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Stage 1 Climax: Sakuga 8-Portrait Anime Opening Montage during Ending Ascent!
  if (hud.screen === 'ENDING_ASCENT') {
    const et = hud.endingTime;
    // Order so the chosen protagonist shines last in the 8-member montage!
    const ordered = [...otherMembers, playerMember];
    const inMontage = et >= 0.9 && et < 4.55;
    const activeIdx = inMontage ? Math.min(7, Math.floor((et - 0.9) / 0.45)) : -1;
    const activeMember = activeIdx >= 0 ? ordered[activeIdx] : null;
    const showAllEightStrip = et >= 4.55 && et < 5.35;

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between overflow-hidden p-5 md:p-8">
        {/* Top dramatic banner */}
        <div className="flex justify-center">
          <div className="cel-box bg-[#050c1a]/90 px-6 py-2 font-display text-xl font-bold tracking-widest text-[#00f0ff] md:text-2xl">
            {et < 0.9
              ? '¡NÚCLEO DEL TERREMOTO DESTRUIDO!'
              : showAllEightStrip
                ? '¡LOS 8 REUNIDOS — ROMPIENDO LA SUPERFICIE!'
                : '¡ASCENSO DE LOS PERDIDOS!'}
          </div>
        </div>

        {/* Rapid Sakuga Individual Anime Portrait Cut-Ins (all 8 members!) */}
        {activeMember && (
          <div key={activeMember.id} className="flex items-center justify-center">
            <div
              className="animate-sakuga cel-box flex w-full max-w-2xl items-center gap-5 bg-[#050b18]/95 px-6 py-3"
              style={{ boxShadow: `8px 8px 0px ${activeMember.accentColor}` }}
            >
              <div className="h-32 w-28 shrink-0 overflow-hidden border-[3px] border-[#050811] bg-slate-900 sm:h-40 sm:w-32">
                <img
                  src={activeMember.portrait}
                  alt={activeMember.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold tracking-widest text-cyan-300">
                  LOS PERDIDOS · {activeIdx + 1}/8
                </div>
                <div
                  className="font-display text-5xl font-bold tracking-wider cel-text-shadow sm:text-6xl"
                  style={{ color: activeMember.accentColor }}
                >
                  {activeMember.name.toUpperCase()}
                </div>
                <div className="mt-1 font-display text-xl font-bold tracking-wide text-white">
                  {activeMember.shout}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grand 8-Panel Split Anime Surge right before the white flash! */}
        {showAllEightStrip && (
          <div className="mx-auto grid w-full max-w-6xl grid-cols-4 gap-1.5 sm:grid-cols-8">
            {MEMBERS.map((m) => (
              <div
                key={m.id}
                className="cel-box-sm relative h-44 overflow-hidden bg-slate-900 sm:h-56"
                style={{ boxShadow: `3px 3px 0px ${m.accentColor}` }}
              >
                <img
                  src={m.portrait}
                  alt={m.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-[#050811]/90 py-1 text-center font-display text-sm font-bold text-white">
                  {m.name.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    );
  }

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const pressureStatus = hud.pressure >= 85 ? 'CRÍTICA' : hud.pressure >= 60 ? 'ALTA' : 'ESTABLE';
  const specialReady = hud.specialCharge >= 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 md:p-4">
      {/* TOP BAR: 3 compact perimeter clusters keeping >=85% canvas unobstructed */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left: Leader Portrait + HP + Water Pressure + Special Bar */}
        <div className="flex items-start gap-2">
          <div className="cel-box-sm relative h-14 w-12 shrink-0 overflow-hidden bg-slate-900 sm:h-16 sm:w-14">
            <img
              src={playerMember.portrait}
              alt={playerMember.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-top"
            />
            {hud.shieldHits > 0 && (
              <div className="absolute inset-x-0 bottom-0 bg-cyan-400 text-center font-mono-num text-[10px] font-bold text-[#050811]">
                ESC x{hud.shieldHits}
              </div>
            )}
          </div>

          <div className="flex w-40 flex-col gap-1 sm:w-56 sm:gap-1.5">
            {/* HP Bar */}
            <div className="cel-box-sm bg-[#061224] px-2 py-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold sm:text-[11px]">
                <span className="text-white">{playerMember.name.toUpperCase()} · VIDA</span>
                <span className="font-mono-num text-emerald-300">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="h-2 w-full border border-[#050811] bg-[#0c1f3a] sm:h-2.5">
                <div
                  className="h-full transition-all duration-100"
                  style={{
                    width: `${hpPct}%`,
                    backgroundColor: hpPct > 35 ? '#10b981' : '#ff2a55',
                  }}
                />
              </div>
            </div>

            {/* Water Pressure Bar */}
            <div className="cel-box-sm bg-[#061224] px-2 py-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold sm:text-[11px]">
                <span className="text-cyan-200">PRESIÓN</span>
                <span
                  className={`font-mono-num ${
                    hud.pressure >= 85
                      ? 'text-rose-400'
                      : hud.pressure >= 60
                        ? 'text-amber-300'
                        : 'text-cyan-300'
                  }`}
                >
                  {hud.pressure}% · {pressureStatus}
                </span>
              </div>
              <div className="h-2 w-full border border-[#050811] bg-[#0c1f3a]">
                <div
                  className="h-full transition-all duration-100"
                  style={{
                    width: `${hud.pressure}%`,
                    backgroundColor:
                      hud.pressure >= 85 ? '#ff2a55' : hud.pressure >= 60 ? '#f59e0b' : '#00f0ff',
                  }}
                />
              </div>
            </div>

            {/* Special Gauge */}
            <div className="cel-box-sm bg-[#061224] px-2 py-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold sm:text-[11px]">
                <span className="truncate text-amber-200">{playerMember.specialName}</span>
                <span className="shrink-0 font-mono-num text-amber-300">
                  {specialReady ? 'LISTO' : `${hud.specialCharge}%`}
                </span>
              </div>
              <div className="h-2 w-full border border-[#050811] bg-[#0c1f3a]">
                <div
                  className="h-full transition-all duration-100"
                  style={{
                    width: `${hud.specialCharge}%`,
                    backgroundColor: specialReady ? '#fde047' : playerMember.accentColor,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center: Timer, Pearls, Score & Boss Bar */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="cel-box-sm flex items-center gap-3 bg-[#061224] px-3 py-1.5 sm:gap-4 sm:px-4">
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-wider text-cyan-300/80">
                {hud.timeFrozen ? 'DETENIDO' : 'TIEMPO'}
              </div>
              <div
                className={`font-mono-num text-base font-bold leading-none sm:text-lg ${
                  hud.timeFrozen
                    ? 'text-indigo-300'
                    : hud.timeLeft < 30
                      ? 'text-rose-400'
                      : 'text-white'
                }`}
              >
                {formatTimer(hud.timeLeft)}
              </div>
            </div>

            <div className="h-6 w-px bg-cyan-500/25" />

            <div className="text-center">
              <div className="text-[10px] font-bold tracking-wider text-amber-300/80">PERLAS</div>
              <div className="font-mono-num text-base font-bold leading-none text-amber-200 sm:text-lg">
                {hud.pearls}
              </div>
            </div>

            <div className="hidden h-6 w-px bg-cyan-500/25 sm:block" />

            <div className="hidden text-center sm:block">
              <div className="text-[10px] font-bold tracking-wider text-slate-300/80">PUNTAJE</div>
              <div className="font-mono-num text-lg font-bold leading-none text-white">
                {hud.score.toLocaleString('es-CL')}
              </div>
            </div>
          </div>

          {/* Boss Health Bar in Act 3 */}
          {hud.bossActive && (
            <div className="cel-box-sm w-56 bg-[#1a0714] px-3 py-1.5 sm:w-80">
              <div className="mb-1 flex items-center justify-between text-xs font-bold">
                <span className="font-display tracking-wider text-rose-300">
                  JEFE · {hud.bossName.toUpperCase()}
                </span>
                <span className="font-mono-num text-white">
                  {hud.bossHp}/{hud.bossMaxHp}
                </span>
              </div>
              <div className="h-3 w-full border border-[#050811] bg-[#3b0a1c]">
                <div
                  className="h-full bg-[#ff2a55] transition-all duration-100"
                  style={{ width: `${Math.max(0, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Back to Hub + Touch Toggle + Mute + Pause + Beat Sync & Live Combo */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                title="Volver al inicio (Selector de minijuegos)"
                className="cel-box-sm flex h-10 items-center gap-1 bg-[#091b33] px-2.5 text-[11px] font-bold text-amber-300 hover:bg-[#112d52] whitespace-nowrap cursor-pointer"
              >
                <span>←</span>
                <span className="hidden sm:inline">Volver al</span>
                <span>Inicio</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTouch}
              title={touchEnabled ? 'Ocultar controles táctiles' : 'Mostrar controles táctiles (celular)'}
              aria-label={touchEnabled ? 'Ocultar controles táctiles' : 'Mostrar controles táctiles'}
              className={`cel-box-sm flex h-10 w-10 items-center justify-center cursor-pointer ${
                touchEnabled
                  ? 'bg-[#00f0ff] text-[#050811]'
                  : 'bg-[#061224] text-cyan-200 hover:bg-[#0d2240]'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
              className="cel-box-sm flex h-10 w-10 items-center justify-center bg-[#061224] text-cyan-200 hover:bg-[#0d2240] cursor-pointer"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onPause}
              aria-label="Pausar juego"
              className="cel-box-sm flex h-10 items-center gap-1.5 bg-[#061224] px-3 text-xs font-bold text-white hover:bg-[#0d2240] whitespace-nowrap cursor-pointer"
            >
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pausa</span>
            </button>
          </div>

          {/* Rhythmic Beat Indicator + Live Combo */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-200">
              <span>PULSO</span>
              <div
                className="h-3 w-10 border border-[#050811] transition-transform duration-75"
                style={{
                  backgroundColor: hud.beatPulse > 0.45 ? '#00f0ff' : '#0f2847',
                  transform: `scale(${1 + hud.beatPulse * 0.16})`,
                }}
              />
            </div>

            {hud.combo > 1 && (
              <div className="cel-box-sm bg-[#061224] px-3 py-1 text-right">
                <div className="font-display text-2xl font-bold leading-none text-amber-300 cel-text-shadow">
                  {hud.combo}x COMBO
                </div>
                {hud.epicCombos > 0 && (
                  <div className="text-[10px] font-bold text-cyan-300">
                    Combos Épicos: {hud.epicCombos}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ANIME CUT-IN BANNER (Special Power / Rescue / Boss Warning) */}
      {cutIn && (
        <div
          key={cutIn.id}
          className="pointer-events-none fixed inset-x-0 top-1/4 z-30 flex justify-center overflow-hidden"
        >
          <div
            className="animate-cutin cel-box flex items-center gap-4 bg-[#050b18] px-6 py-2.5"
            style={{ borderColor: '#050811', boxShadow: `6px 6px 0px ${cutIn.accentColor}` }}
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-[#050811] bg-slate-900">
              <img
                src={getMemberById(cutIn.memberId).portrait}
                alt={cutIn.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="pr-2">
              <div
                className="font-display text-2xl font-bold tracking-wider cel-text-shadow sm:text-3xl"
                style={{ color: cutIn.accentColor }}
              >
                {cutIn.title}
              </div>
              <div className="text-xs font-semibold text-white">{cutIn.subtitle}</div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR: Rescued Teammates Roster — centered cleanly above thumb zone when Touch Controls are on */}
      <div
        className={`flex items-end gap-3 ${
          touchEnabled ? 'justify-center pb-1' : 'justify-between'
        }`}
      >
        <div className="cel-box-sm bg-[#061224]/95 px-2.5 py-1.5 sm:px-3 sm:py-2">
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold sm:text-[11px]">
            <span className="text-cyan-200">RESCATADOS</span>
            <span className="font-mono-num text-white">{hud.rescuedIds.length}/7</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {otherMembers.map((m) => {
              const isRescued = rescuedSet.has(m.id);
              return (
                <div
                  key={m.id}
                  title={isRescued ? `${m.name} (Rescatado)` : `${m.name} (Atrapado)`}
                  className="relative h-8 w-7 overflow-hidden border-2 border-[#050811] bg-slate-900 sm:h-10 sm:w-9"
                  style={{
                    boxShadow: isRescued ? `2px 2px 0px ${m.accentColor}` : 'none',
                  }}
                >
                  <img
                    src={m.portrait}
                    alt={m.name}
                    referrerPolicy="no-referrer"
                    className={`h-full w-full object-cover object-top transition-opacity duration-200 ${
                      isRescued ? 'opacity-100' : 'opacity-30 grayscale'
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-[#050811]/85 text-center font-display text-[8px] font-bold text-white sm:text-[9px]">
                    {m.name.slice(0, 4).toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop control reminder when touch controls are hidden */}
        {!touchEnabled && (
          <div className="hidden text-xs font-medium text-cyan-200/75 md:block">
            WASD / Flechas Mover · Espacio Atacar · Shift / E Especial · Esc Pausa
          </div>
        )}
      </div>

      {/* Dual-Thumb Mobile Touch Controls (Left Analog Joystick + Right Attack & Special) */}
      {touchEnabled && hud.screen === 'PLAYING' && (
        <TouchControls
          specialCharge={hud.specialCharge}
          accentColor={playerMember.accentColor}
          onMove={onVirtualMove}
          onAttack={onTouchAttack}
          onSpecial={onTouchSpecial}
        />
      )}
    </div>
  );
}
