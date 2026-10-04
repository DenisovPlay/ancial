import { cn } from '../../lib/cn';

/**
 * Живой фон Вейва: три слоя мягких волн, плывущих с разной скоростью и чуть покачивающихся.
 * Только transform (css-анимации в globals.css, `.wave-backdrop`); на паузе, пока блок не виден или включён
 * режим «меньше движения». Бесшовность: слой в два раза шире блока и сдвигается ровно на период.
 */
const LAYERS = [
  // period — длина волны в единицах viewBox (1200 = два периода по 600 на всю ширину слоя)
  { period: 600, height: 'h-3/5', from: '#a855f7', to: '#ec4899', opacity: 0.34, className: 'wave-layer-a' },
  { period: 300, height: 'h-1/2', from: '#6366f1', to: '#a855f7', opacity: 0.28, className: 'wave-layer-b' },
  { period: 200, height: 'h-2/5', from: '#ec4899', to: '#f97316', opacity: 0.2, className: 'wave-layer-c' },
] as const;

/** Синусоида из квадратичных кривых: M0,60 Q p/4,0 p/2,60 T p,60 T … до 1200, затем заливка вниз. */
function wavePath(period: number) {
  const steps = 1200 / (period / 2);
  const tail = Array.from({ length: steps - 1 }, (_, i) => `T${(period / 2) * (i + 2)},60`).join(' ');
  return `M0,60 Q${period / 4},0 ${period / 2},60 ${tail} L1200,120 L0,120 Z`;
}

export default function WaveBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-[#150d26] to-zinc-950" />
      {LAYERS.map((layer, index) => (
        <div key={index} className={cn('wave-bob absolute inset-x-0 bottom-0', layer.height)} style={{ animationDelay: `${index * -3}s` }}>
          <svg
            className={cn('wave-layer h-full w-[200%] max-w-none', layer.className)}
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`wave-grad-${index}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor={layer.from} />
                <stop offset="1" stopColor={layer.to} />
              </linearGradient>
            </defs>
            <path d={wavePath(layer.period)} fill={`url(#wave-grad-${index})`} fillOpacity={layer.opacity} />
          </svg>
        </div>
      ))}
    </div>
  );
}
