import { describe, expect, it } from 'vitest';
import { isClinical, modulesFor, vocab } from './accountKind';

describe('account kinds', () => {
  it('only physiotherapy is clinical', () => {
    expect(isClinical('physio')).toBe(true);
    expect(isClinical(undefined)).toBe(true);
    expect(isClinical('coach')).toBe(false);
    expect(modulesFor('personal')).toEqual(['kracht', 'mobiliteit']);
  });

  it('coaches get their own words, physiotherapy keeps the source text', () => {
    expect(vocab('coach', 'Nieuwe patiënt voor je praktijk', 'nl')).toBe('Nieuwe klant voor je studio');
    expect(vocab('coach', 'Patiënten van de fysiotherapeut', 'nl')).toBe('Klanten van de coach');
    expect(vocab('coach', 'Invite a patient to your practice', 'en')).toBe('Invite a client to your studio');
    expect(vocab('physio', 'Nieuwe patiënt', 'nl')).toBe('Nieuwe patiënt');
  });

  it('personal accounts are pointed to professionals in general', () => {
    expect(vocab('personal', 'Bericht voor je fysiotherapeut', 'nl')).toBe('Notitie voor jezelf');
    expect(vocab('personal', 'Stop en neem contact op met je fysiotherapeut.', 'nl')).toBe('Stop en neem contact op met een fysiotherapeut of huisarts.');
    expect(vocab('personal', 'Goed bezig. Je fysiotherapeut kan je voortgang en feedback nu bekijken.', 'nl')).toBe('Goed bezig. Je training is opgeslagen.');
  });
});
