import { useRef, useState } from 'react';
import { Swords, Zap } from 'lucide-react';

interface TouchControlsProps {
  specialCharge: number;
  accentColor: string;
  onMove: (dx: number, dy: number) => void;
  onAttack: () => void;
  onSpecial: () => void;
}

const MAX_RADIUS = 44;

export function TouchControls({
  specialCharge,
  accentColor,
  onMove,
  onAttack,
  onSpecial,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const attackIntervalRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const specialReady = specialCharge >= 100;

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rawX = clientX - cx;
    const rawY = clientY - cy;
    const dist = Math.hypot(rawX, rawY);
    const clamped = Math.min(dist, MAX_RADIUS);
    const nx = dist > 0.01 ? (rawX / dist) * (clamped / MAX_RADIUS) : 0;
    const ny = dist > 0.01 ? (rawY / dist) * (clamped / MAX_RADIUS) : 0;
    setKnob({ x: nx * MAX_RADIUS, y: ny * MAX_RADIUS });
    onMove(nx, ny);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setDragging(false);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const startHoldAttack = () => {
    onAttack();
    if (attackIntervalRef.current !== null) {
      window.clearInterval(attackIntervalRef.current);
    }
    attackIntervalRef.current = window.setInterval(() => {
      onAttack();
    }, 180);
  };

  const stopHoldAttack = () => {
    if (attackIntervalRef.current !== null) {
      window.clearInterval(attackIntervalRef.current);
      attackIntervalRef.current = null;
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-4 sm:px-6 sm:pb-6">
      {/* Left Thumb: 360° Virtual Analog Joystick (Multi-Touch Independent) */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          if (activePointerId.current !== null) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          activePointerId.current = e.pointerId;
          setDragging(true);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          resetStick();
        }}
        onPointerCancel={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          resetStick();
        }}
        aria-label="Joystick táctil de movimiento"
        className="pointer-events-auto relative flex h-32 w-32 touch-none items-center justify-center rounded-full border-[3px] border-[#050811] bg-[#061428]/75 shadow-[4px_4px_0px_#050811]"
      >
        {/* Crosshair guide */}
        <div className="pointer-events-none absolute h-16 w-0.5 bg-cyan-400/25" />
        <div className="pointer-events-none absolute h-0.5 w-16 bg-cyan-400/25" />

        {/* Analog Knob */}
        <div
          className="pointer-events-none flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#050811] shadow-[2px_2px_0px_#050811] transition-transform duration-75"
          style={{
            backgroundColor: dragging ? '#00f0ff' : accentColor,
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        >
          <div className="h-5 w-5 rounded-full border-2 border-[#050811] bg-white/80" />
        </div>
      </div>

      {/* Right Thumb: Simultaneous Attack + Special Power Buttons */}
      <div className="pointer-events-auto flex items-end gap-3 touch-none">
        {/* Special Power Button */}
        <button
          type="button"
          disabled={!specialReady}
          onPointerDown={(e) => {
            e.preventDefault();
            if (specialReady) onSpecial();
          }}
          aria-label="Activar poder especial"
          className={`flex h-20 w-20 flex-col items-center justify-center rounded-full border-[3px] border-[#050811] font-display transition-transform duration-100 active:scale-95 ${
            specialReady
              ? 'bg-amber-300 text-[#050811] shadow-[4px_4px_0px_#00f0ff]'
              : 'bg-[#081a33]/85 text-slate-300 shadow-[3px_3px_0px_#050811]'
          }`}
        >
          <Zap className="h-5 w-5" />
          <span className="text-xs font-bold tracking-wider">ESPECIAL</span>
          <span className="font-mono-num text-[10px] font-bold">
            {specialReady ? 'LISTO' : `${specialCharge}%`}
          </span>
        </button>

        {/* Primary Basic Attack Button (supports tap or hold) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            startHoldAttack();
          }}
          onPointerUp={stopHoldAttack}
          onPointerCancel={stopHoldAttack}
          aria-label="Ataque básico"
          className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-[3px] border-[#050811] bg-[#00f0ff] font-display text-[#050811] shadow-[4px_4px_0px_#050811] transition-transform duration-100 active:scale-95"
        >
          <Swords className="h-7 w-7" />
          <span className="text-base font-bold tracking-wider">ATACAR</span>
        </button>
      </div>
    </div>
  );
}
