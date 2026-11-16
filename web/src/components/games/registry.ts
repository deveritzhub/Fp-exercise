import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MinigameKey } from '@shared/minigames';
import type { GameProps } from './types';

/** Each little game in its own file, loaded only when it is played. */
export const GAME_COMPONENTS: Record<MinigameKey, LazyExoticComponent<ComponentType<GameProps>>> = {
  balance: lazy(() => import('./BalanceGame')),
  reaction: lazy(() => import('./ReactionGame')),
  mirror: lazy(() => import('./MirrorGame')),
  rhythm: lazy(() => import('./RhythmGame')),
  plate: lazy(() => import('./PlateGame')),
  market: lazy(() => import('./MarketGame')),
  breath: lazy(() => import('./BreathGame')),
  pain_facts: lazy(() => import('./PainFactsGame')),
  journey: lazy(() => import('./JourneyGame')),
};
