import { z, type ZodTypeAny } from 'zod';
import { badRequest } from './errors';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(
      'validation_failed',
      // Code and limits let the app say exactly what is wrong with which field.
      r.error.issues.map((i) => {
        const x = i as typeof i & { minimum?: unknown; maximum?: unknown; validation?: unknown; type?: unknown; received?: unknown };
        return { path: i.path.join('.'), message: i.message, code: i.code, minimum: x.minimum, maximum: x.maximum, validation: x.validation, type: x.type, received: x.received };
      }),
    );
  }
  return r.data;
}

export const uuidParam = z.string().uuid();
export const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();
export const shortText = (max: number) => z.string().trim().max(max);
