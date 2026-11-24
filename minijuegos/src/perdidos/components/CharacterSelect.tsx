import { useEffect } from 'react';
import { ArrowLeft, Play, Shield, Sparkles, Zap } from 'lucide-react';
import { MEMBERS, type MemberId, getMemberById } from '../game/characters';

interface CharacterSelectProps {
  selectedId: MemberId;
  onSelect: (id: MemberId) => void;
  onBack: () => void;
  onStartMission: (id: MemberId) => void;
  onBackToHub?: () => void;
}

export function CharacterSelect({
  selectedId,
  onSelect,
  onBack,
  onStartMission,
  onBackToHub,
}: CharacterSelectProps) {
  const active = getMemberById(selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = MEMBERS.findIndex((m) => m.id === selectedId);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        onSelect(MEMBERS[(idx + 1) % MEMBERS.length].id);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        onSelect(MEMBERS[(idx - 1 + MEMBERS.length) % MEMBERS.length].id);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        onSelect(MEMBERS[(idx + 4) % MEMBERS.length].id);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        onSelect(MEMBERS[(idx - 4 + MEMBERS.length) % MEMBERS.length].id);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartMission(selectedId);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, onSelect, onStartMission, onBack]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto p-4 md:p-8">
      {/* Header row */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
          {onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="cel-box-sm flex h-9 items-center gap-1.5 bg-[#091b33] px-3 text-xs font-bold text-amber-300 transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              ← Volver al inicio
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="cel-box-sm flex h-9 items-center gap-1.5 bg-[#0a1d36] px-3 text-xs font-semibold text-cyan-200 transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Portada
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-white cel-text-shadow sm:text-3xl md:text-4xl">
              ELIGE A TU INTEGRANTE
            </h1>
            <p className="hidden text-xs text-cyan-200/80 sm:block md:text-sm">
              Cada integrante de Los Perdidos tiene un poder especial y una ventaja pasiva única bajo el agua.
            </p>
          </div>
        </div>
        <div className="hidden text-xs font-medium text-cyan-200/75 md:block">
          Flechas Elegir · Enter Comenzar
        </div>
      </div>

      {/* Main 2-column selector: 4x2 Portrait Grid (responsive on mobile & desktop) + Active Dossier */}
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-4 sm:gap-6 lg:grid-cols-12">
        {/* 8-Member Anime Grid (4x2 on both mobile and desktop so mobile fits without long scrolling) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:col-span-7">
          {MEMBERS.map((member) => {
            const isSelected = member.id === selectedId;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelect(member.id)}
                className={`group relative flex flex-col overflow-hidden bg-[#07172d] text-left transition-transform duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  isSelected
                    ? 'cel-box-cyan -translate-y-1 ring-2 ring-cyan-300'
                    : 'cel-box-sm opacity-90 hover:-translate-y-0.5 hover:opacity-100'
                }`}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                  <img
                    src={member.portrait}
                    alt={`${member.name} — ${member.specialName}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                  />
                  {/* Measured contrast scrim for member name */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#040914] via-[#040914]/75 to-transparent px-2.5 pb-2 pt-7">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-display text-xl font-bold tracking-wide text-white cel-text-shadow">
                        {member.name.toUpperCase()}
                      </span>
                      <span
                        className="h-2.5 w-2.5 shrink-0 border border-[#050811]"
                        style={{ backgroundColor: member.accentColor }}
                      />
                    </div>
                    <div className="truncate text-[11px] font-medium text-cyan-200/85">
                      {member.role}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Member Dossier */}
        <div className="cel-box flex flex-col justify-between gap-5 bg-[#07162b] p-5 lg:col-span-5">
          <div className="flex items-start gap-4">
            <div className="cel-box-sm h-28 w-24 shrink-0 overflow-hidden bg-slate-900">
              <img
                src={active.portrait}
                alt={active.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-cyan-300">
                {active.alias} · {active.role}
              </div>
              <h2 className="font-display text-4xl font-bold tracking-wide text-white cel-text-shadow">
                {active.name.toUpperCase()}
              </h2>
              <div className="mt-1 text-xs text-slate-300">
                HP Máximo: <span className="font-mono-num font-bold text-white">{active.maxHp}</span>
              </div>
            </div>
          </div>

          {/* Active Power & Passive Details */}
          <div className="space-y-3 border-t border-cyan-500/20 pt-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-cyan-300">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>PODER ESPECIAL (SHIFT / E) · {active.specialName}</span>
              </div>
              <p className="mt-1 text-sm leading-snug text-slate-200">
                {active.specialDesc}
              </p>
            </div>

            <div className="border-t border-cyan-500/15 pt-3">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-amber-300">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>VENTAJA PASIVA · {active.passiveName}</span>
              </div>
              <p className="mt-1 text-sm leading-snug text-slate-200">
                {active.passiveDesc}
              </p>
            </div>
          </div>

          {/* Cel-shaded 4 Stat Bars */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-cyan-500/20 pt-3">
            {[
              { label: 'Velocidad', val: active.stats.speed },
              { label: 'Poder', val: active.stats.power },
              { label: 'Resistencia', val: active.stats.endurance },
              { label: 'Utilidad', val: active.stats.utility },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>{s.label}</span>
                  <span className="font-mono-num text-cyan-200">{s.val}/5</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className="h-2.5 flex-1 border border-[#050811]"
                      style={{
                        backgroundColor: step <= s.val ? active.accentColor : '#0f233e',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Primary Start CTA */}
          <button
            type="button"
            onClick={() => onStartMission(active.id)}
            className="cel-box-cyan flex w-full items-center justify-center gap-2.5 bg-[#00f0ff] px-6 py-3.5 font-display text-2xl font-bold tracking-wider text-[#050811] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#67e8f9] active:translate-y-0.5 whitespace-nowrap cursor-pointer"
          >
            <Play className="h-5 w-5 fill-current" />
            COMENZAR CON {active.name.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Subtle footer tip */}
      <div className="mx-auto mt-3 flex w-full max-w-6xl items-center justify-between text-xs text-cyan-200/70">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Ataca al ritmo del pulso musical para encadenar Combos Épicos y alcanzar el Rango S.
        </span>
        <span className="hidden sm:inline">Objetivo: Rescata a los 7 integrantes y vence al Núcleo Abisal</span>
      </div>
    </div>
  );
}
