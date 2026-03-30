'use client';

import React, { useEffect } from 'react';

type YandexContextWindow = Window &
  typeof globalThis & {
    Ya?: {
      Context?: {
        AdvManager?: {
          render: (options: { blockId: string; renderTo: string }) => void;
        };
      };
    };
    yaContextCb?: Array<() => void>;
  };

export default function YandexRtb({
  blockId,
  className,
}: {
  blockId: string;
  className?: string;
}) {
  useEffect(() => {
    try {
      const w = window as YandexContextWindow;
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

  return (
    <div
      id={`yandex_rtb_${blockId}`}
      className={className ?? 'w-full max-h-24 hidden lg:block'}
    ></div>
  );
}
