import { describe, expect, it } from 'vitest';
import { aclMemorabilia, aclUnlocked, runeTier } from './aclRewards';

const empty = { defeatedPhases: [] as number[], flexionMilestone: false, unassistedGait: false, bestQuadLsi: 0, consistentWeeks: 0, guildRaidDefeated: false };

describe('ACL reward items', () => {
  it('gives phase 1 pieces only when that boss falls, not from extra weeks', () => {
    expect(aclUnlocked({ ...empty, consistentWeeks: 20 })).not.toContain('ice_pack');
    expect(aclUnlocked({ ...empty, defeatedPhases: [1] })).toEqual(expect.arrayContaining(['ice_pack', 'deswell_mantle', 'iron_brace']));
  });

  it('turns the staff and the hinge on from the phase-2 milestones', () => {
    const keys = aclUnlocked({ ...empty, unassistedGait: true, flexionMilestone: true });
    expect(keys).toContain('crutch_staff');
    expect(keys).toContain('golden_hinge');
    expect(keys).not.toContain('pilgrim_boots');
  });

  it('keeps the wolf to four weeks of showing up, and the horse to the last boss', () => {
    expect(aclUnlocked({ ...empty, consistentWeeks: 3 })).not.toContain('pet_wolf');
    expect(aclUnlocked({ ...empty, consistentWeeks: 4 })).toContain('pet_wolf');
    expect(aclUnlocked({ ...empty, consistentWeeks: 4 })).not.toContain('pet_horse');
    expect(aclUnlocked({ ...empty, defeatedPhases: [5] })).toContain('pet_horse');
    expect(aclUnlocked({ ...empty, defeatedPhases: [5] })).toContain('sport_football');
  });

  it('does not dim the runes after a lower index, and shelves early gear after the next boss', () => {
    expect(runeTier(72)).toBe(3);
    expect(runeTier(100)).toBe(5);
    const owned = aclUnlocked({ ...empty, defeatedPhases: [1, 2] });
    expect(aclMemorabilia(owned, [1])).toEqual([]);
    expect(aclMemorabilia(owned, [1, 2])).toEqual(expect.arrayContaining(['ice_pack', 'iron_brace']));
  });
});
