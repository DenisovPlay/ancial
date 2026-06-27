// QR decode Web Worker
// jsQR is imported as a self-contained script from CDN inside the worker scope

importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

let busy = false;

self.onmessage = (e) => {
  if (busy) return;
  const { data, width, height } = e.data;
  busy = true;
  try {
    const result = self.jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    if (result) {
      self.postMessage({ data: result.data, location: result.location });
    } else {
      self.postMessage(null);
    }
  } catch {
    self.postMessage(null);
  } finally {
    busy = false;
  }
};
