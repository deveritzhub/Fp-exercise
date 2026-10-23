import { describe, it, expect } from 'vitest';
import { app } from './helpers';
import { config } from '../src/config';

describe('Digital Asset Links for the Google Play app', () => {
  it('is an empty list until the app is configured', async () => {
    const r = await app.request('/.well-known/assetlinks.json');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([]);
  });

  it('names the package and certificate fingerprints once configured', async () => {
    const fp = Array.from({ length: 32 }, () => 'AB').join(':');
    const keep = config.android;
    config.android = { packageName: 'nl.functionalperformance.oefenapp', fingerprints: [fp] };
    try {
      const r = await app.request('/.well-known/assetlinks.json');
      expect(r.headers.get('content-type')).toMatch(/application\/json/);
      expect(await r.json()).toEqual([
        { relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'nl.functionalperformance.oefenapp', sha256_cert_fingerprints: [fp] } },
      ]);
    } finally {
      config.android = keep;
    }
  });
});
