/**
 * Universal Share & Image Download utilities that work reliably across:
 * - Android Tablets & Phones (Chrome, Samsung Internet)
 * - iPadOS & iOS (Safari, Chrome)
 * - Desktop browsers (Chrome, Edge, Firefox, Safari)
 * - In-app WebViews (Instagram, WhatsApp, TikTok)
 *
 * Key principle: Pre-generate the PNG File + Blob URL + Data URL BEFORE the user taps,
 * so `navigator.share` and `<a download>` run synchronously inside the tap gesture
 * without losing Transient User Activation.
 */

export interface PreparedShareCard {
  file: File;
  blob: Blob;
  blobUrl: string;
  dataUrl: string;
  filename: string;
}

export async function canvasToPreparedCard(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<PreparedShareCard | null> {
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return null;
  const file = new File([blob], filename, { type: 'image/png' });
  const blobUrl = URL.createObjectURL(blob);
  return { file, blob, blobUrl, dataUrl, filename };
}

export function buildGameShareUrl(gameSlug: 'bities' | 'los-perdidos'): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + '/');
  url.searchParams.set('juego', gameSlug);
  return url.toString();
}

/**
 * Reliable clipboard copy that tries modern Clipboard API first and falls back
 * to a synchronous hidden textarea `execCommand('copy')` for tablets / WebViews.
 */
export async function copyTextUniversal(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Try synchronous execCommand first as backup helper
  const fallbackCopy = (): boolean => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopy();
    }
  }

  return fallbackCopy();
}

/**
 * Triggers a DOM-attached blob download synchronously inside a user tap.
 */
export function triggerPreparedDownload(card: PreparedShareCard): void {
  const link = document.createElement('a');
  link.href = card.blobUrl;
  link.download = card.filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  }, 1500);
}

export type ShareOutcome =
  | 'shared-file'
  | 'shared-link'
  | 'downloaded-and-copied'
  | 'cancelled';

/**
 * Synchronously invokes Web Share API using an ALREADY-PREPARED File so tablets
 * (iPadOS / Android) never block the share sheet due to async gesture expiration.
 */
export async function sharePreparedCard(
  card: PreparedShareCard | null,
  opts: { title: string; text: string; url: string }
): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // 1. Try sharing the PNG image file + text (ideal for Instagram Stories, WhatsApp, Save Image)
    if (card) {
      let canShareFiles = false;
      try {
        canShareFiles =
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [card.file] });
      } catch {
        canShareFiles = false;
      }

      if (canShareFiles) {
        try {
          await navigator.share({
            files: [card.file],
            title: opts.title,
            text: opts.text,
          });
          return 'shared-file';
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return 'cancelled';
          }
          // Some Android builds reject combining `files` + `text`; retry with `files` alone
          try {
            await navigator.share({
              files: [card.file],
              title: opts.title,
            });
            return 'shared-file';
          } catch (err2) {
            if (err2 instanceof DOMException && err2.name === 'AbortError') {
              return 'cancelled';
            }
          }
        }
      }
    }

    // 2. Fallback to sharing text + URL via native share sheet
    try {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return 'shared-link';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  // 3. Desktop / WebView fallback: download the PNG card + copy text & link to clipboard
  if (card) {
    triggerPreparedDownload(card);
  }
  await copyTextUniversal(opts.text);
  return 'downloaded-and-copied';
}

export function openWhatsAppShare(text: string): void {
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
