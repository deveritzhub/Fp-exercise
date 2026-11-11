import { z, type ZodTypeAny } from 'zod';
import { badRequest } from './errors';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(
      'validation_failed',
      // Code and limits let the app say exactly what is wrong with which field.
      r.error.issues.map((i) => {
        // Zod 4 issues, in the shape the app reads (the v3 field names): origin → type, invalid_format →
        // invalid_string with its validation, and what was received for a missing value.
        const x = i as typeof i & { minimum?: unknown; maximum?: unknown; origin?: unknown; format?: unknown };
        const code = i.code === ('invalid_format' as typeof i.code) ? 'invalid_string' : i.code;
        const at = i.path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<PropertyKey, unknown>)[k as PropertyKey] : undefined), data);
        const received = i.code === 'invalid_type' ? (at === undefined ? 'undefined' : at === null ? 'null' : typeof at) : undefined;
        return { path: i.path.join('.'), message: i.message, code, minimum: x.minimum, maximum: x.maximum, validation: x.format, type: x.origin, received };
      }),
    );
  }
  return r.data;
}

export const uuidParam = z.string().uuid();
export const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();
export const shortText = (max: number) => z.string().trim().max(max);
