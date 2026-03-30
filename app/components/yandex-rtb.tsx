'use client';

import React, { useEffect } from 'react';

export default function YandexRtb({ blockId }: { blockId: string }) {
  useEffect(() => {
    try {
      const w = window as any;
      if (w.yaContextCb) {
        w.yaContextCb.push(() => {
          if (w.Ya && w.Ya.Context && w.Ya.Context.AdvManager) {
            w.Ya.Context.AdvManager.render({
              blockId: blockId,
              renderTo: `yandex_rtb_${blockId}`
            });
          }
        });
      }
    } catch (e) {
      console.error('Yandex RTB Error:', e);
    }
  }, [blockId]);

  return <div id={`yandex_rtb_${blockId}`} className="w-full max-h-24 hidden lg:block"></div>;
}
