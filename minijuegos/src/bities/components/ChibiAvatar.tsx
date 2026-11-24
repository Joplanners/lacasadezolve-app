import { useEffect, useState } from 'react';
import { loadAsset, type LoadedAsset } from '../game/assets';
import type { AvatarId } from '../game/types';

interface ChibiAvatarProps {
  avatar: AvatarId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  wearsHeadband?: boolean;
  holdingPhone?: boolean;
  holdingLightstick?: boolean;
  jumping?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-14 h-14',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
  xl: 'w-36 h-36',
};

/**
 * Reusable chibi portrait component that loads custom /assets/avatar-*.png
 * with automatic fallback to bundled generated portraits and a styled SVG fallback.
 */
export function ChibiAvatar({
  avatar,
  size = 'md',
  wearsHeadband = false,
  holdingPhone = false,
  holdingLightstick = false,
  jumping = false,
  className = '',
}: ChibiAvatarProps) {
  const [asset, setAsset] = useState<LoadedAsset | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let active = true;
    setImgError(false);
    loadAsset(avatar === 'girl' ? 'avatar-girl' : 'avatar-boy').then((loaded) => {
      if (active) setAsset(loaded);
    });
    return () => {
      active = false;
    };
  }, [avatar]);

  const label = avatar === 'girl' ? 'Avatar Chica' : 'Avatar Chico';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        jumping ? 'animate-jump-joy' : ''
      } ${className}`}
    >
      <div
        className={`${SIZE_MAP[size]} relative rounded-full overflow-hidden border-[3px] border-white shadow-[0_8px_24px_rgba(27,11,56,0.45)] bg-gradient-to-b from-[#ede9fe] to-[#ddd6fe]`}
      >
        {asset?.src && !imgError ? (
          <img
            src={asset.src}
            alt={label}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#7c3aed] to-[#4c1d95] text-white">
            <span className="text-3xl" role="img" aria-label={label}>
              {avatar === 'girl' ? '👧🏻' : '👦🏻'}
            </span>
          </div>
        )}

        {/* Purple "BITIES" forehead headband overlay */}
        {wearsHeadband && (
          <div className="absolute inset-x-0 top-[21%] flex justify-center pointer-events-none">
            <div className="w-[86%] py-0.5 rounded-full bg-[#6d28d9] border-2 border-[#ede9fe] shadow-md text-center">
              <span className="font-display font-bold text-[11px] sm:text-xs tracking-wider text-white leading-none block">
                BITIES
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Optional fluttering headband ribbon tails */}
      {wearsHeadband && (
        <svg
          viewBox="0 0 36 28"
          className="w-8 h-6 absolute -right-4 top-[18%] pointer-events-none drop-shadow"
          aria-hidden="true"
        >
          <path d="M2 8 Q18 2 34 10 L29 16 Q16 10 2 13 Z" fill="#7c3aed" stroke="#f5f3ff" strokeWidth="1.5" />
          <path d="M4 13 Q18 14 31 24 L24 26 Q14 19 3 17 Z" fill="#5b21b6" stroke="#f5f3ff" strokeWidth="1.3" />
        </svg>
      )}

      {/* Optional glowing phone prop */}
      {holdingPhone && (
        <div
          className="absolute -right-2 -bottom-1 w-9 h-12 rounded-lg bg-[#1b0b38] border-2 border-[#328990] shadow-lg flex flex-col items-center justify-center rotate-12"
          aria-hidden="true"
        >
          <div className="w-6 h-8 rounded bg-gradient-to-b from-[#a78bfa] to-[#328990] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/90" />
          </div>
        </div>
      )}

      {/* Optional glowing purple lightstick prop */}
      {holdingLightstick && (
        <div
          className="absolute -right-3 bottom-0 flex flex-col items-center rotate-12 pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-7 h-7 rounded-full bg-[#f5f3ff] border-2 border-[#7c3aed] shadow-[0_0_16px_rgba(167,139,250,0.95)] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#e85d24]" />
          </div>
          <div className="w-2 h-6 bg-[#1e1036] rounded-b-full -mt-0.5" />
        </div>
      )}
    </div>
  );
}
