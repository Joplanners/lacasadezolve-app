import { useEffect, useRef, useState } from 'react';
import { Clock, RotateCcw, Send } from 'lucide-react';
import { soundEngine } from '../game/sound';
import type { PlayerProfile } from '../game/types';
import { ChibiAvatar } from './ChibiAvatar';

interface Phase2SocialWaveProps {
  profile: PlayerProfile;
  onComplete: (messagesSent: number) => void;
}

interface FloatingBubble {
  id: number;
  text: string;
  leftPct: number;
  color: string;
}

const TARGET_MESSAGES = 10;
const TIME_LIMIT_SECONDS = 30;

const SOCIAL_MESSAGES = [
  {
    id: 'msg-1',
    text: '¡Queremos que venga BITIES!',
    bg: 'bg-[#6d28d9] hover:bg-[#7c3aed] border-[#4c1d95]',
    bubbleBg: '#7c3aed',
  },
  {
    id: 'msg-2',
    text: '¡Organización ARMY activa!',
    bg: 'bg-[#328990] hover:bg-[#3b9da5] border-[#216166]',
    bubbleBg: '#328990',
  },
  {
    id: 'msg-3',
    text: '¡El concierto se hace sí o sí!',
    bg: 'bg-[#e85d24] hover:bg-[#f36b33] border-[#b24113]',
    bubbleBg: '#e85d24',
  },
] as const;

export function Phase2SocialWave({ profile, onComplete }: Phase2SocialWaveProps) {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [avatarBounce, setAvatarBounce] = useState(false);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const nextBubbleId = useRef(1);

  useEffect(() => {
    soundEngine.setTrack('mission');
  }, []);

  // 30-second countdown timer while actively playing
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setStatus('lost');
          soundEngine.playMissionFail();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  // Auto-advance smoothly on win
  useEffect(() => {
    if (status !== 'won') return;
    const timer = window.setTimeout(() => {
      onComplete(TARGET_MESSAGES);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [status, onComplete]);

  const handleRetry = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    setCount(0);
    setTimeLeft(TIME_LIMIT_SECONDS);
    setBubbles([]);
    setStatus('playing');
  };

  const handleSendMessage = (text: string, color: string) => {
    if (status !== 'playing') return;
    soundEngine.unlock();

    const nextCount = Math.min(TARGET_MESSAGES, count + 1);
    setCount(nextCount);
    soundEngine.playSocialTap(nextCount);

    setAvatarBounce(true);
    window.setTimeout(() => setAvatarBounce(false), 220);

    const id = nextBubbleId.current++;
    const leftPct = 16 + ((id * 23) % 62);
    setBubbles((prev) => [...prev.slice(-8), { id, text, leftPct, color }]);

    window.setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 1700);

    if (nextCount >= TARGET_MESSAGES) {
      setStatus('won');
      soundEngine.playVictory();
    }
  };

  const progressPct = Math.round((count / TARGET_MESSAGES) * 100);
  const lowTime = timeLeft <= 8 && status === 'playing';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#230c4a] via-[#34156b] to-[#1a0a36] px-4 pt-14 pb-4">
      {/* Top Mission Header, Timer & Progress Bar (0 / 10) */}
      <div className="relative z-20 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#c4b5fd]">
              Misión 1 · Ola en Redes Sociales
            </p>
            <h2 className="font-display font-bold text-lg sm:text-xl text-white leading-tight">
              ¡Envía 10 mensajes antes que termine el tiempo!
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* 30s Countdown Readout */}
            <div
              className={`flex items-center gap-1 font-mono-num font-bold text-lg ${
                lowTime ? 'text-[#fb923c]' : 'text-[#99f6e4]'
              }`}
              aria-label={`Tiempo restante: ${timeLeft} segundos`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{timeLeft}s</span>
            </div>

            <span className="font-mono-num font-bold text-xl text-[#fde047]">
              {count}/{TARGET_MESSAGES}
            </span>
          </div>
        </div>

        {/* Clean High-Contrast Progress Bar */}
        <div
          className="w-full h-3.5 rounded-full bg-[#15072b] border border-white/20 overflow-hidden p-0.5"
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={TARGET_MESSAGES}
          aria-label="Mensajes enviados"
        >
          <div
            className="h-full rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #328990 0%, #8b5cf6 55%, #e85d24 100%)',
            }}
          />
        </div>
      </div>

      {/* Interactive Sky Stage (flex-1 min-h-0 so bottom buttons stay locked in frame) */}
      <div className="relative flex-1 min-h-0 my-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#160830]/80 via-[#2a1257]/60 to-[#1f0d42]/90 overflow-hidden flex flex-col items-center justify-end pb-3">
        {/* Subtle night stars */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="w-1.5 h-1.5 rounded-full bg-[#fde047] absolute top-6 left-10" />
          <div className="w-2 h-2 rounded-full bg-[#c4b5fd] absolute top-14 right-12" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#46a8b0] absolute top-24 left-1/3" />
          <div className="w-1.5 h-1.5 rounded-full bg-white absolute top-10 left-2/3" />
        </div>

        {/* Floating Animated Message Bubbles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {bubbles.map((b) => (
            <div
              key={b.id}
              className="animate-bubble-rise absolute bottom-24 max-w-[230px] px-4 py-2 rounded-2xl text-white font-bold text-sm shadow-xl border-2 border-white/80"
              style={{
                left: `${b.leftPct}%`,
                transform: 'translateX(-30%)',
                backgroundColor: b.color,
              }}
            >
              {b.text}
            </div>
          ))}
        </div>

        {/* Overlay Status Message (does not push avatar or bottom buttons) */}
        {status === 'won' && (
          <div className="absolute top-4 inset-x-4 z-20 flex justify-center">
            <div className="animate-pop-in bg-[#fffaf3] text-[#1c0c38] px-5 py-3 rounded-2xl border-2 border-[#fde047] shadow-2xl text-center">
              <p className="font-display font-bold text-xl text-[#6d28d9]">
                ¡Tendencia #1 en Chile!
              </p>
              <p className="text-sm font-semibold text-[#328990]">
                ¡Ahora salimos a la calle!
              </p>
            </div>
          </div>
        )}

        {status === 'playing' && (
          <p className="relative z-10 mb-2 px-4 text-center text-xs sm:text-sm font-medium text-[#e9d5ff]">
            Toca los botones de abajo para enviar mensajes
          </p>
        )}

        {/* Cheering Chibi Avatar with Headband & Phone */}
        <div
          className={`relative z-10 transition-transform duration-150 ${
            avatarBounce ? '-translate-y-3 scale-105' : ''
          }`}
        >
          <ChibiAvatar
            avatar={profile.avatar}
            size="lg"
            wearsHeadband
            holdingPhone
            jumping={status === 'won'}
          />
        </div>
      </div>

      {/* 3 Big Accessible Touch Buttons (shrink-0 so always visible) */}
      <div className="relative z-20 shrink-0 flex flex-col gap-2">
        {SOCIAL_MESSAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={status !== 'playing'}
            onClick={() => handleSendMessage(item.text, item.bubbleBg)}
            className={`w-full min-h-[52px] px-4 py-2.5 rounded-2xl text-white font-display font-bold text-base sm:text-lg border-b-4 shadow-lg active:scale-[0.97] active:translate-y-0.5 transition-all duration-100 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fde047] ${item.bg}`}
          >
            <span className="text-left leading-tight">{item.text}</span>
            <Send className="w-5 h-5 shrink-0 opacity-95" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Timeout Retry Modal */}
      {status === 'lost' && (
        <div className="absolute inset-0 z-40 bg-[#140729]/85 flex items-center justify-center p-5">
          <div className="animate-pop-in w-full max-w-[350px] bg-[#fffaf3] text-[#1c0c38] rounded-3xl p-5 border-4 border-[#e85d24] shadow-2xl flex flex-col items-center text-center gap-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#e85d24]">
              Tiempo agotado
            </p>
            <h3 className="font-display font-bold text-2xl leading-snug text-[#1c0c38]">
              ¡Ohhh no! No se alcanzó la tendencia
            </h3>
            <p className="text-sm font-medium text-[#4a396b]">
              Alcanzaste a enviar <strong className="text-[#6d28d9]">{count} de {TARGET_MESSAGES} mensajes</strong>. ¡Vamos, inténtalo otra vez!
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="w-full min-h-[54px] mt-1 px-5 py-3 rounded-2xl bg-[#e85d24] hover:bg-[#f26b34] active:scale-[0.98] text-white font-display font-bold text-lg border-b-4 border-[#b24113] shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reintentar Misión 1</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
