import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Utensils } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Macros } from '@shared/foods';

type FoodDay = { totals: Macros; proteinGoal: number | null; items: unknown[]; profile?: { hideKcal: boolean }; targets?: { kcal: number } | null };

/** Today: nutrition at a glance, with the way to log what you eat. */
export function NutritionCard() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['food-day'], queryFn: () => api.get<FoodDay>('/patient/food') });
  const d = q.data;
  return (
    <section aria-labelledby="nutrition-card" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card" data-testid="nutrition-card">
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-600">{t('Voeding · vandaag', 'Nutrition · today')}</p>
        <h2 id="nutrition-card" className="mt-0.5 text-[16.5px] font-bold text-ink-950">{t('Eten bijhouden', 'Track what you eat')}</h2>
        <p className="mt-0.5 text-[13.5px] text-ink-600">
          {d && d.items.length
            ? [
                !d.profile?.hideKcal && `${d.totals.kcal}${d.targets ? `/${d.targets.kcal}` : ''} kcal`,
                t(`${Math.round(d.totals.protein)}${d.proteinGoal ? `/${d.proteinGoal}` : ''} g eiwit`, `${Math.round(d.totals.protein)}${d.proteinGoal ? `/${d.proteinGoal}` : ''} g protein`),
              ].filter(Boolean).join(' · ')
            : t('Recepten, weekplan en boodschappenlijst.', 'Recipes, week plan and shopping list.')}
        </p>
      </div>
      <Link to="/p/voeding" className="tap inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl border-2 border-accent px-4 text-[15px] font-semibold text-accent hover:bg-accent-soft">
        <Utensils className="h-4 w-4" aria-hidden />{t('Voeding', 'Nutrition')}
      </Link>
    </section>
  );
}

/** Today: the 3D village is one tap away, without being where the app opens. */
export function Village3DCard() {
  const { t } = useI18n();
  return (
    <Link to="/p/dorp" data-testid="open-3d-village"
      className="tap flex items-center gap-3 rounded-2xl lux-dark bg-[linear-gradient(135deg,#1f3a5f_0%,#2f5d4a_100%)] p-4 text-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15"><Gamepad2 className="h-6 w-6" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16.5px] font-bold">{t('Speel in je 3D-dorp', 'Play in your 3D village')}</span>
        <span className="block text-[13.5px] text-white/85">{t('Loop rond, versla wezens en bouw je huis.', 'Walk around, beat creatures and build your home.')}</span>
      </span>
    </Link>
  );
}
