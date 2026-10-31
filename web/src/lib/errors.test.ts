import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from './api';
import { describeError, errorMessage, fieldErrors, slugify } from './i18n';
import { parse } from '../../../server/src/lib/validate';

/** What the server sends for a rejected form, exactly as the API produces it. */
function rejected(schema: z.ZodTypeAny, data: unknown) {
  try {
    parse(schema, data);
  } catch (e) {
    const err = e as { code: string; details: unknown };
    return new ApiError(400, err.code, err.details);
  }
  throw new Error('expected a validation error');
}

const practice = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2),
});

describe('error messages say what is wrong', () => {
  it('names every wrong field and the reason', () => {
    const err = rejected(practice, { name: 'X', slug: 'Fp', ownerEmail: 'geen-mail', ownerName: 'Dinish' });
    const text = describeError(err, 'nl');
    expect(text).toContain('Naam is te kort (minimaal 2 tekens)');
    expect(text).toContain('Slug heeft een ongeldig formaat: alleen kleine letters, cijfers en streepjes');
    expect(text).toContain('E-mail eigenaar is geen geldig e-mailadres');
    expect(describeError(err, 'en')).toContain('Slug has an invalid format: only lowercase letters');
  });

  it('gives a message per field for the inputs', () => {
    const f = fieldErrors(rejected(practice, { name: 'Praktijk', slug: 'Fp', ownerEmail: 'a@b.nl' }), 'nl');
    expect(f.slug).toMatch(/^Heeft een ongeldig formaat/);
    expect(f.ownerName).toBe('Is verplicht.');
    expect(f.name).toBeUndefined();
  });

  it('always shows the code of an unknown error', () => {
    expect(errorMessage('something_new', 'nl')).toBe('Er ging iets mis. Probeer het opnieuw. (foutcode: something_new)');
    expect(describeError(new ApiError(409, 'slug_taken'), 'nl')).toBe('Deze praktijk-URL is al in gebruik.');
    expect(describeError(new Error('Failed to fetch'), 'nl')).toContain('(Failed to fetch)');
  });

  it('turns typed text into a valid slug', () => {
    expect(slugify('Fp')).toBe('fp');
    expect(slugify('Mijn Praktijk Één!!')).toBe('mijn-praktijk-een-');
    expect(slugify('Mijn Praktijk Één!!', true)).toBe('mijn-praktijk-een');
    expect(slugify('  --fp  training')).toBe('fp-training');
  });
});
