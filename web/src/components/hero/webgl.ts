/** True when this browser can paint a WebGL canvas. `?webgl=0` forces the fallback for tests. */
export function webglAvailable() {
  if (typeof document === 'undefined') return false;
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('webgl') === '0') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
