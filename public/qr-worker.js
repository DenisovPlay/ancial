// QR decode Web Worker
// jsQR is imported as a self-contained local script inside the worker scope

importScripts('/jsQR.js');

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
