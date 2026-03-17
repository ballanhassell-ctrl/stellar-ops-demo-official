import { ReactNode, useRef } from 'react';
import { gsap } from 'gsap';

type PixelDissolveCardProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

const GRID_SIZE = 4;

export default function PixelDissolveCard({ children, className = '', disabled = false }: PixelDissolveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pixelGridRef = useRef<HTMLDivElement>(null);

  const triggerDissolve = () => {
    if (disabled || !cardRef.current || !pixelGridRef.current) return;

    const pixelGrid = pixelGridRef.current;
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

    const staggerDuration = 0.45 / Math.max(pixels.length, 1);

    gsap.killTweensOf([cardRef.current, ...pixels]);

    const tl = gsap.timeline();
    tl.to(cardRef.current, {
      scale: 0.995,
      duration: 0.2,
      ease: 'power2.in',
    });

    tl.to(
      pixels,
      {
        opacity: (index) => {
          const col = index % GRID_SIZE;
          const row = Math.floor(index / GRID_SIZE);
          const normalizedPosition = (col + row) / (GRID_SIZE * 2 - 2);
          return 0.5 + normalizedPosition * 0.5;
        },
        duration: 0.2,
        stagger: { each: staggerDuration, from: 'random' },
        ease: 'power2.inOut',
      },
      '<'
    );

    tl.to(pixels, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out',
    });

    tl.to(cardRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, '<');
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
