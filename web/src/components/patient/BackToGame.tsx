import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * The way back to the game: a page opened from the 3D village (a shop, the backpack, a keeper's
 * choice) shows a bar to go straight back to it, instead of only the way to Today or the hero.
 */
const KEY = 'fp.fromGame';
export const markFromGame = () => {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* storage optional */ }
};
export const clearFromGame = () => {
  try { sessionStorage.removeItem(KEY); } catch { /* storage optional */ }
};
const fromGame = () => {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};

export function BackToGame() {
  const { t } = useI18n();
  const loc = useLocation();
  const [on, setOn] = useState(fromGame);
  useEffect(() => setOn(fromGame()), [loc.pathname]);
  if (!on || loc.pathname.startsWith('/p/dorp')) return null;
  return (
    <Link to="/p/dorp" data-testid="back-to-game" onClick={clearFromGame}
      className="mb-3 flex min-h-[48px] items-center gap-2 rounded-xl border border-[#e4bc63] bg-[#141c18] px-4 text-[15px] font-semibold text-[#f6e2a6] shadow-lift">
      <ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug naar het spel', 'Back to the game')}
    </Link>
  );
}
