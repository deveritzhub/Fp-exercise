import { z } from 'zod';
import { HERO_OPTIONS } from '../../../shared/hero';

/** How a professional looks in the village: the same choices as a patient's hero, without a name. */
export const staffLook = z.object({
  frame: z.enum(HERO_OPTIONS.frame),
  build: z.enum(HERO_OPTIONS.build),
  skin: z.enum(HERO_OPTIONS.skin),
  hair: z.enum(HERO_OPTIONS.hair),
  hairColor: z.enum(HERO_OPTIONS.hairColor),
  eyeColor: z.enum(HERO_OPTIONS.eyeColor),
  beard: z.enum(HERO_OPTIONS.beard),
  glasses: z.enum(HERO_OPTIONS.glasses),
  outfit: z.enum(HERO_OPTIONS.outfit),
}).strict();
export type StaffLook = z.infer<typeof staffLook>;
/** A stored look that still fits today's choices, or null. */
export const readStaffLook = (v: unknown): StaffLook | null => {
  const r = staffLook.safeParse(v);
  return r.success ? r.data : null;
};
