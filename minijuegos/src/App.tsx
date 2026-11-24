import { useCallback, useEffect, useState } from 'react';
import { Gamepad2, Sparkles, Compass, Heart, Play } from 'lucide-react';
import BitiesApp from './bities/BitiesApp';
import PerdidosApp from './perdidos/PerdidosApp';

export type ActiveGame = 'hub' | 'bities' | 'los-perdidos';

function detectGameFromUrl(): ActiveGame {
  if (typeof window === 'undefined') return 'hub';
  const params = new URLSearchParams(window.location.search);
  const queryGame = params.get('juego')?.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  if (queryGame === 'bities' || path.includes('bities')) {
    return 'bities';
  }
  if (
    queryGame === 'los-perdidos' ||
    queryGame === 'perdidos' ||
    queryGame === 'suiatsu' ||
    path.includes('perdidos') ||
    path.includes('suiatsu')
  ) {
    return 'los-perdidos';
  }
  return 'hub';
}

export default function App() {
  const [activeGame, setActiveGame] = useState<ActiveGame>(() => detectGameFromUrl());

  const selectGame = useCallback((game: ActiveGame) => {
    setActiveGame(game);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/';
      if (game === 'hub') {
        url.searchParams.delete('juego');
        document.title = 'Minijuegos · La Casa de Zolve';
      } else if (game === 'bities') {
        url.searchParams.set('juego', 'bities');
        document.title = 'Misión BITIES: Rumbo al Estadio · La Casa de Zolve';
      } else {
        url.searchParams.set('juego', 'los-perdidos');
        document.title = 'Los Perdidos: Suiatsu · La Casa de Zolve';
      }
      window.history.pushState({ game }, '', url.toString());
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveGame(detectGameFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (activeGame === 'bities') {
    return <BitiesApp onBackToHub={() => selectGame('hub')} />;
  }

  if (activeGame === 'los-perdidos') {
    return <PerdidosApp onBackToHub={() => selectGame('hub')} />;
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-[#100624] text-white">
      {/* Ambient Background Glows */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 22%, rgba(139,92,246,0.32) 0%, transparent 46%), radial-gradient(circle at 82% 26%, rgba(0,212,255,0.24) 0%, transparent 46%), radial-gradient(circle at 50% 92%, rgba(232,93,36,0.22) 0%, transparent 50%), linear-gradient(180deg, #14072e 0%, #090316 100%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col justify-between px-4 py-6 sm:px-6 md:py-10">
        {/* Header Branding */}
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#fde047]/40 bg-[#230f49]/85 px-4 py-1.5 text-xs font-bold tracking-wider uppercase text-[#fde047] shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-[#e85d24]" />
            <span>Especial Navideño · La Casa de Zolve</span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            Arcade K-Pop · Elige tu Misión
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-purple-100/85 sm:text-base">
            Dos minijuegos creados con cariño por <strong className="text-[#fde047]">La Casa de Zolve</strong> para disfrutar, competir por el mejor puntaje y compartir tu tarjeta en redes.
          </p>
        </header>

        {/* Two Game Cards Grid */}
        <section
          aria-label="Selector de minijuegos"
          className="my-6 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {/* Card 1: Misión BITIES */}
          <article
            onClick={() => selectGame('bities')}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-purple-400/35 bg-gradient-to-b from-[#261152] to-[#160833] p-5 shadow-[0_20px_50px_rgba(12,4,28,0.85)] transition-all duration-200 hover:-translate-y-1 hover:border-[#fde047] cursor-pointer"
          >
            <div>
              {/* Cover Image Banner */}
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#180736] sm:h-52">
                <img
                  src="/src/assets/images/bg_stadium_1795404441657.jpg"
                  alt="Misión BITIES: Rumbo al Estadio"
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#160833] via-[#160833]/35 to-transparent" />

                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-xl bg-[#6d28d9]/90 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white border border-purple-300/40 shadow">
                    💜 ARMY · BTS
                  </span>
                  <span className="rounded-xl bg-[#1b0b38]/85 px-2.5 py-1 text-[11px] font-bold text-[#fde047] border border-white/15">
                    RPG Casual · 3 Misiones
                  </span>
                </div>

                {/* Floating Avatar Preview */}
                <div className="absolute -bottom-2 right-3 flex items-center gap-1.5">
                  <img
                    src="/src/assets/images/avatar_girl_1795404441864.jpg"
                    alt="Avatar ARMY"
                    className="h-14 w-14 rounded-2xl border-2 border-[#fde047] object-cover shadow-lg"
                  />
                  <img
                    src="/src/assets/images/avatar_boy_1795404441688.jpg"
                    alt="Avatar ARMY"
                    className="h-12 w-12 rounded-2xl border-2 border-purple-300 object-cover shadow-lg"
                  />
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#fde047]">
                  <Heart className="h-3.5 w-3.5 fill-[#e85d24] text-[#e85d24]" />
                  <span>Aventura Navideña</span>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-[26px]">
                  Misión BITIES: Rumbo al Estadio
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-purple-100/85">
                  Personaliza tu avatar, inunda las redes de mensajes, une fans por las calles de Chile, prepara tu mochila y enciende el océano morado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectGame('bities');
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#b24113] bg-[#e85d24] px-5 py-3.5 font-display text-lg font-bold text-white shadow-lg transition-all group-hover:bg-[#f26b34] active:scale-[0.99] cursor-pointer"
            >
              <Play className="h-5 w-5 fill-white" />
              <span>Jugar Misión BITIES</span>
            </button>
          </article>

          {/* Card 2: Los Perdidos: Suiatsu */}
          <article
            onClick={() => selectGame('los-perdidos')}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-cyan-400/35 bg-gradient-to-b from-[#092244] to-[#041022] p-5 shadow-[0_20px_50px_rgba(3,9,22,0.9)] transition-all duration-200 hover:-translate-y-1 hover:border-[#00f0ff] cursor-pointer"
          >
            <div>
              {/* Cover Image Banner */}
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#061830] sm:h-52">
                <img
                  src="/assets/aistudio/suiatsu_skz_dtf_d2ed75a3.png"
                  alt="Los Perdidos: Suiatsu"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#041022] via-[#041022]/30 to-transparent" />

                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-xl bg-[#00d4ff] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[#050811] shadow">
                    🧭 STAY · SKZ
                  </span>
                  <span className="rounded-xl bg-[#051126]/90 px-2.5 py-1 text-[11px] font-bold text-[#fde047] border border-cyan-300/30">
                    Acción 2D · 8 Personajes
                  </span>
                </div>

                {/* Floating Member Thumbnails */}
                <div className="absolute -bottom-2 right-3 flex items-center -space-x-2">
                  <img
                    src="/assets/aistudio/Bangchan_1cbb37ab.jpg"
                    alt="Chan"
                    className="h-12 w-12 rounded-2xl border-2 border-[#00f0ff] object-cover object-top shadow-lg"
                  />
                  <img
                    src="/assets/aistudio/Felix_f1e5bcbe.jpg"
                    alt="Felix"
                    className="h-12 w-12 rounded-2xl border-2 border-[#fde047] object-cover object-top shadow-lg"
                  />
                  <img
                    src="/assets/aistudio/Hyunjin_dd7a5b7a.jpg"
                    alt="Hyunjin"
                    className="h-12 w-12 rounded-2xl border-2 border-cyan-200 object-cover object-top shadow-lg"
                  />
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00f0ff]">
                  <Compass className="h-3.5 w-3.5 text-[#fde047]" />
                  <span>Edición Opening Anime</span>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-[26px]">
                  Los Perdidos: Suiatsu
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-cyan-100/85">
                  Elige entre los 8 integrantes con habilidades únicas, rescata al equipo en el abismo submarino, encadena combos al ritmo y alcanza el Rango S.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectGame('los-perdidos');
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#008ca8] bg-[#00f0ff] px-5 py-3.5 font-display text-lg font-bold text-[#050811] shadow-lg transition-all group-hover:bg-[#67e8f9] active:scale-[0.99] cursor-pointer"
            >
              <Gamepad2 className="h-5 w-5" />
              <span>Jugar Los Perdidos</span>
            </button>
          </article>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-purple-200/70">
          Hecho con 💜 por <strong className="text-white">La Casa de Zolve</strong> · Comparte tu tarjeta final en Instagram Stories o WhatsApp
        </footer>
      </div>
    </main>
  );
}
