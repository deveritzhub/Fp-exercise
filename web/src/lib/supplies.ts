import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { flaskGlasses, mainMealsLogged, rations, wellFed, type Used } from '@shared/supplies';

/**
 * The hero's supplies for today: glasses from the water that was logged, rations from the meals that
 * were logged. What the hero already used in the village is a game counter, kept in this browser.
 */
const KEY = 'fp.village.used';
const today = () => new Date().toDateString();
const readUsed = (): Used => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as ({ day: string } & Used) | null;
    return v && v.day === today() ? { water: v.water || 0, food: v.food || 0 } : { water: 0, food: 0 };
  } catch {
    return { water: 0, food: 0 };
  }
};

export function useSupplies(waterMl: number, enabled: boolean) {
  const food = useQuery({ queryKey: ['food-day'], queryFn: () => api.get<{ items: { meal: string }[] }>('/patient/food'), enabled });
  const meals = (food.data?.items ?? []).map((i) => i.meal);
  const [used, setUsed] = useState<Used>(readUsed);
  const use = useCallback((what: keyof Used) => {
    setUsed((u) => {
      const next = { ...u, [what]: u[what] + 1 };
      try { localStorage.setItem(KEY, JSON.stringify({ day: today(), ...next })); } catch { /* not kept: fine */ }
      return next;
    });
  }, []);
  return { glasses: flaskGlasses(waterMl, used.water), rations: rations(meals, used.food), fed: wellFed(meals), mainMeals: mainMealsLogged(meals), use };
}
