import { ReactNode, useRef } from 'react';

type PixelDissolveCardProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

const GRID_SIZE = 4;

export default function PixelDissolveCard({ children, className = '', disabled = false }: PixelDissolveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pixelGridRef = useRef<HTMLDivElement>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  const triggerDissolve = () => {
    if (disabled || !cardRef.current || !pixelGridRef.current) return;

    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    const pixelGrid = pixelGridRef.current;
    const card = cardRef.current;
    pixelGrid.innerHTML = '';

    const totalCells = GRID_SIZE * GRID_SIZE;
    const skipIndexes = new Set<number>();
    while (skipIndexes.size < 3) {
      skipIndexes.add(Math.floor(Math.random() * totalCells));
    }

    const pixels: HTMLDivElement[] = [];

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const index = row * GRID_SIZE + col;
        if (skipIndexes.has(index)) continue;

        const pixel = document.createElement('div');
        pixel.style.position = 'absolute';
        pixel.style.left = `${(col / GRID_SIZE) * 100}%`;
        pixel.style.top = `${(row / GRID_SIZE) * 100}%`;
        pixel.style.width = `${100 / GRID_SIZE}%`;
        pixel.style.height = `${100 / GRID_SIZE}%`;
        pixel.style.opacity = '0';

        const isIndigo = Math.random() < 0.5;
        pixel.style.background = isIndigo ? 'rgba(99, 102, 241, 0.44)' : 'rgba(2, 6, 23, 0.42)';
        pixel.style.backdropFilter = 'blur(2px)';
        pixel.style.mixBlendMode = 'screen';

        pixelGrid.appendChild(pixel);
        pixels.push(pixel);
      }
    }

    card.style.transition = 'transform 200ms cubic-bezier(0.4, 0, 1, 1)';
    card.style.transform = 'scale(0.995)';

    const shuffledPixels = [...pixels].sort(() => Math.random() - 0.5);

    shuffledPixels.forEach((pixel, index) => {
      const col = index % GRID_SIZE;
      const row = Math.floor(index / GRID_SIZE);
      const normalizedPosition = (col + row) / (GRID_SIZE * 2 - 2);
      const peakOpacity = 0.5 + normalizedPosition * 0.5;
      const enterDelayMs = Math.floor(index * 20);
      const fadeDelayMs = enterDelayMs + 200;

      pixel.style.transition = `opacity 200ms ease ${enterDelayMs}ms`;
      requestAnimationFrame(() => {
        pixel.style.opacity = `${peakOpacity}`;
      });

      window.setTimeout(() => {
        pixel.style.transition = 'opacity 300ms ease';
        pixel.style.opacity = '0';
      }, fadeDelayMs);
    });

    const totalDurationMs = shuffledPixels.length * 20 + 550;
    cleanupTimerRef.current = window.setTimeout(() => {
      pixelGrid.innerHTML = '';
      card.style.transition = 'transform 300ms cubic-bezier(0, 0, 0.2, 1)';
      card.style.transform = 'scale(1)';
      cleanupTimerRef.current = null;
    }, totalDurationMs);
  };

  return (
    <div
      ref={cardRef}
      onMouseLeave={triggerDissolve}
      className={`relative overflow-hidden transition-transform duration-500 ease-in hover:scale-[1.01] ${className}`}
    >
      <div ref={pixelGridRef} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
