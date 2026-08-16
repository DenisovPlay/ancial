'use client';

import { useLayoutEffect } from 'react';
import {
  GLASS_MODE_CHANGE_EVENT,
  GLASS_MODE_STORAGE_KEY,
  applyGlassProfile,
  readGlassMode,
} from '../lib/android-glass';

export default function AndroidGlassProfile() {
  useLayoutEffect(() => {
    const applyProfile = () => applyGlassProfile(readGlassMode());
    applyProfile();

    // React owns the server-rendered <html> className and may restore it during
    // hydration or Fast Refresh. Re-apply the device profile if that happens.
    const observer = new MutationObserver(applyProfile);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === GLASS_MODE_STORAGE_KEY) applyProfile();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(GLASS_MODE_CHANGE_EVENT, applyProfile);
    window.addEventListener('pageshow', applyProfile);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(GLASS_MODE_CHANGE_EVENT, applyProfile);
      window.removeEventListener('pageshow', applyProfile);
    };
  }, []);

  return null;
}
