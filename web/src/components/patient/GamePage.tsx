import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** True inside the panel of the game (the page is shown in a frame over the 3D world). */
export const inGameFrame = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};
/** From inside the panel: ask the game to close it (a link back to the village, for one). */
export const closeGameFrame = () => {
  try {
    window.parent.postMessage({ type: 'fp-close-game-page' }, window.location.origin);
  } catch { /* nothing to close */ }
};

/**
 * A page of the app shown over the 3D world, so the hero does not leave it: what a figure or a
 * building opens (nutrition, the mobility measurement, the muscle atlas...). The page runs in a frame
 * without the app's header and tabs; closing it returns to the game where the hero stood.
 */
export function GamePage({ href, onClose }: { href: string; onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && (e.data as { type?: string })?.type === 'fp-close-game-page') onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('message', onMsg);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55" role="dialog" aria-modal="true" aria-label={t('Pagina in het spel', 'Page in the game')} data-testid="game-page">
      <div className="flex h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#e4bc63] bg-canvas shadow-lift">
        <button type="button" onClick={onClose} data-testid="game-page-close"
          className="flex min-h-[52px] shrink-0 items-center gap-2 border-b border-[#e4bc63] bg-[#141c18] px-4 text-left text-[15px] font-semibold text-[#f6e2a6]">
          <ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug naar het spel', 'Back to the game')}
        </button>
        <iframe src={href} title={t('Pagina in het spel', 'Page in the game')} className="min-h-0 w-full flex-1 border-0 bg-canvas" data-testid="game-page-frame" />
      </div>
    </div>
  );
}
