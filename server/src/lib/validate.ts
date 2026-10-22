import { z, type ZodTypeAny } from 'zod';
import { badRequest } from './errors';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(
      'validation_failed',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}

export const uuidParam = z.string().uuid();
export const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();
export const shortText = (max: number) => z.string().trim().max(max);
