import { describe, expect, it } from 'vitest';
import { accentVars } from '../web/src/lib/accent';
describe('white label accent validation',()=>{
 it('accepts valid dark accent',()=>{
  const d=accentVars('#343F2A');expect(d).not.toBeNull();expect(d?.['--accent-ink']).toBe('255 255 255');
 });
 it('rejects unsafe or malformed accent strings',()=>{
  expect(accentVars('red; background:url(javascript:evil)')).toBeNull();
  expect(accentVars('#1234')).toBeNull();
 });
 it('darkens light colours so the preview uses accessible text',()=>{
  const d=accentVars('#ffffff');expect(d).not.toBeNull();expect(d?.['--accent']).not.toEqual('255 255 255');
 });
 it('restores default theme for absent or historical defaults',()=>{
  expect(accentVars(null)).toBeNull();expect(accentVars('#29483c')).toBeNull();
 });
});
