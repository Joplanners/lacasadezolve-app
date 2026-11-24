/**
 * Resilient Asset Manager with drop-in /assets/... override support,
 * bundled generated artwork fallbacks, and clean procedural canvas sprites.
 */

import type { AssetKey } from './types';

interface AssetSourceConfig {
  /** Filename looked up inside public/assets/ if the user provides custom overrides */
  customFilename: string;
  /** Built-in illustrated art generated for the game (optional) */
  generatedPath?: string;
  /** True when the generated room image has a vertical split that should be cropped to its top half */
  cropTopHalf?: boolean;
}

// Discover any custom drop-in files placed inside /public/assets/ without causing 404 console noise
const discoveredCustomAssets = import.meta.glob('/public/assets/*', {
  eager: false,
});

function hasCustomPublicAsset(filename: string): boolean {
  return `/public/assets/${filename}` in discoveredCustomAssets;
}

export const ASSET_CATALOG: Record<AssetKey, AssetSourceConfig> = {
  'avatar-girl': {
    customFilename: 'avatar-girl.png',
    generatedPath: '/src/assets/images/avatar_girl_1795404441864.jpg',
  },
  'avatar-boy': {
    customFilename: 'avatar-boy.png',
    generatedPath: '/src/assets/images/avatar_boy_1795404441688.jpg',
  },
  'bg-room': {
    customFilename: 'bg-room.webp',
    generatedPath: '/src/assets/images/bg_room_1795404441589.jpg',
    cropTopHalf: true,
  },
  'bg-street': {
    customFilename: 'bg-street.webp',
    generatedPath: '/src/assets/images/bg_street_1795404441321.jpg',
  },
  'bg-stadium': {
    customFilename: 'bg-stadium.webp',
    generatedPath: '/src/assets/images/bg_stadium_1795404441657.jpg',
  },
  'item-lightstick': {
    customFilename: 'item-lightstick.png',
  },
  'item-tshirt': {
    customFilename: 'item-tshirt.png',
  },
  'item-powerbank': {
    customFilename: 'item-powerbank.png',
  },
  'item-bandana': {
    customFilename: 'item-bandana.png',
  },
  'item-ticket': {
    customFilename: 'item-ticket.png',
  },
  'npc-army': {
    customFilename: 'npc-army.png',
  },
  'obstacle-fake': {
    customFilename: 'obstacle-fake.png',
  },
};

export interface LoadedAsset {
  img: HTMLImageElement | null;
  src: string | null;
  isCustom: boolean;
  cropTopHalf: boolean;
}

const cache = new Map<AssetKey, LoadedAsset>();
const pending = new Map<AssetKey, Promise<LoadedAsset>>();

function tryLoadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Loads an asset by first checking if a custom override exists in public/assets/,
 * then falling back to the bundled generated artwork, and finally returning null
 * so the game renders crisp procedural vector/canvas graphics with zero broken frames.
 */
export function loadAsset(key: AssetKey): Promise<LoadedAsset> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const existingPromise = pending.get(key);
  if (existingPromise) return existingPromise;

  const cfg = ASSET_CATALOG[key];
  const promise = (async (): Promise<LoadedAsset> => {
    // 1. Load custom override from /assets/<file> only when present (avoids 404 noise)
    if (hasCustomPublicAsset(cfg.customFilename)) {
      const customPath = `/assets/${cfg.customFilename}`;
      const customImg = await tryLoadImage(customPath);
      if (customImg) {
        const result: LoadedAsset = {
          img: customImg,
          src: customPath,
          isCustom: true,
          cropTopHalf: false,
        };
        cache.set(key, result);
        return result;
      }
    }

    // 2. Fallback to bundled generated artwork
    if (cfg.generatedPath) {
      const genImg = await tryLoadImage(cfg.generatedPath);
      if (genImg) {
        const result: LoadedAsset = {
          img: genImg,
          src: cfg.generatedPath,
          isCustom: false,
          cropTopHalf: Boolean(cfg.cropTopHalf),
        };
        cache.set(key, result);
        return result;
      }
    }

    // 3. Clean procedural fallback (never broken)
    const fallback: LoadedAsset = {
      img: null,
      src: null,
      isCustom: false,
      cropTopHalf: false,
    };
    cache.set(key, fallback);
    return fallback;
  })();

  pending.set(key, promise);
  return promise;
}

export function getCachedAsset(key: AssetKey): LoadedAsset | undefined {
  return cache.get(key);
}

export function preloadCoreAssets(): Promise<void> {
  const keys: AssetKey[] = [
    'avatar-girl',
    'avatar-boy',
    'bg-room',
    'bg-street',
    'bg-stadium',
    'item-lightstick',
    'item-tshirt',
    'item-powerbank',
    'item-bandana',
    'item-ticket',
    'npc-army',
    'obstacle-fake',
  ];
  return Promise.all(keys.map((k) => loadAsset(k))).then(() => undefined);
}
