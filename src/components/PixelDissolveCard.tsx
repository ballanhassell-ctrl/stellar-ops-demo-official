import { ReactNode, useEffect, useRef } from 'react';

type PixelDissolveCardProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

type GsapModule = {
  timeline: (vars?: Record<string, unknown>) => {
    to: (targets: unknown, vars: Record<string, unknown>, position?: string) => unknown;
  };
  killTweensOf: (targets: unknown) => void;
};

const GRID_SIZE = 4;
const PIXEL_STAGGER_MS = 12;
const PIXEL_RISE_MS = 140;
const PIXEL_FALL_MS = 240;
const OVERLAY_FADE_MS = 220;

export default function PixelDissolveCard({ children, className = '', disabled = false }: PixelDissolveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pixelGridRef = useRef<HTMLDivElement>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const animationTimeoutsRef = useRef<number[]>([]);
  const gsapRef = useRef<GsapModule | null>(null);

  useEffect(() => {
    let isMounted = true;

    import('gsap')
      .then((module) => {
        if (!isMounted) return;
        gsapRef.current = (module as { gsap?: GsapModule; default?: GsapModule }).gsap
          ?? (module as { default?: GsapModule }).default
          ?? null;
      })
      .catch(() => {
        gsapRef.current = null;
      });

    return () => {
      isMounted = false;
      animationTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      animationTimeoutsRef.current = [];

      if (cleanupTimerRef.current) {
        window.clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }

      if (cardRef.current && pixelGridRef.current) {
        gsapRef.current?.killTweensOf([cardRef.current, ...Array.from(pixelGridRef.current.children)]);
      }
    };
  }, []);

  const clearAnimationTimers = () => {
    animationTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    animationTimeoutsRef.current = [];
  };

  const buildPixelGrid = (pixelGrid: HTMLDivElement) => {
    const totalCells = GRID_SIZE * GRID_SIZE;
    const skipIndexes = new Set<number>();
    while (skipIndexes.size < 3) {
      skipIndexes.add(Math.floor(Math.random() * totalCells));
    }

    pixelGrid.innerHTML = '';
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

    return pixels;
  };

  const triggerDissolve = () => {
    if (disabled || !cardRef.current || !pixelGridRef.current) return;

    clearAnimationTimers();

    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    const pixelGrid = pixelGridRef.current;
    const card = cardRef.current;
    const pixels = buildPixelGrid(pixelGrid);
    const gsap = gsapRef.current;

    if (gsap) {
      const shuffledPixels = [...pixels].sort(() => Math.random() - 0.5);
      const staggerDuration = 0.45 / Math.max(shuffledPixels.length, 1);

      gsap.killTweensOf([card, ...pixels]);

      const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
      timeline.to(card, { scale: 0.995, duration: 0.2, ease: 'power2.in' });
      timeline.to(
        shuffledPixels,
        {
          opacity: (index: number) => {
            const col = index % GRID_SIZE;
            const row = Math.floor(index / GRID_SIZE);
            const normalizedPosition = (col + row) / (GRID_SIZE * 2 - 2);
            return 0.5 + normalizedPosition * 0.5;
          },
          duration: 0.2,
          stagger: { each: staggerDuration, from: 'random' },
          ease: 'power2.inOut',
        },
        '<',
      );
      timeline.to(shuffledPixels, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      timeline.to(
        card,
        {
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            pixelGrid.innerHTML = '';
          },
        },
        '<',
      );
      return;
    }

    card.style.transition = 'transform 200ms cubic-bezier(0.4, 0, 1, 1)';
    card.style.transform = 'scale(0.995)';

    const shuffledPixels = [...pixels].sort(() => Math.random() - 0.5);

    shuffledPixels.forEach((pixel, index) => {
      const col = index % GRID_SIZE;
      const row = Math.floor(index / GRID_SIZE);
      const normalizedPosition = (col + row) / (GRID_SIZE * 2 - 2);
      const peakOpacity = 0.5 + normalizedPosition * 0.5;
      const enterDelayMs = Math.floor(index * PIXEL_STAGGER_MS);
      const fadeDelayMs = enterDelayMs + PIXEL_RISE_MS;

      pixel.style.transition = `opacity ${PIXEL_RISE_MS}ms ease ${enterDelayMs}ms`;
      requestAnimationFrame(() => {
        pixel.style.opacity = `${peakOpacity}`;
      });

      const fadeTimeout = window.setTimeout(() => {
        pixel.style.transition = 'opacity 300ms ease';
        pixel.style.opacity = '0';
      }, fadeDelayMs);

      animationTimeoutsRef.current.push(fadeTimeout);
    });

    const totalDurationMs = shuffledPixels.length * PIXEL_STAGGER_MS + PIXEL_RISE_MS + PIXEL_FALL_MS;
    cleanupTimerRef.current = window.setTimeout(() => {
      pixelGrid.style.transition = `opacity ${OVERLAY_FADE_MS}ms ease`;
      pixelGrid.style.opacity = '0';

      window.setTimeout(() => {
        pixelGrid.innerHTML = '';
        pixelGrid.style.opacity = '1';
        pixelGrid.style.transition = '';
      }, OVERLAY_FADE_MS);

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
