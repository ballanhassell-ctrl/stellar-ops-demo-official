import { useEffect } from 'react';

const CARD_SELECTOR = '.glass-card, .glass-card-dark, .glass-eod-light, .glass-eod-dark';
const GRID_SIZE = 4;
const PIXEL_STAGGER_MS = 12;
const PIXEL_RISE_MS = 140;
const PIXEL_FALL_MS = 240;
const OVERLAY_FADE_MS = 220;

const createPixels = () => {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '30';

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
      pixel.style.background = Math.random() < 0.5 ? 'rgba(99, 102, 241, 0.44)' : 'rgba(2, 6, 23, 0.42)';
      pixel.style.backdropFilter = 'blur(2px)';
      pixel.style.mixBlendMode = 'screen';

      overlay.appendChild(pixel);
      pixels.push(pixel);
    }
  }

  return { overlay, pixels };
};

export default function GlobalPixelDissolve() {
  useEffect(() => {
    const timeoutMap = new WeakMap<HTMLElement, number>();

    const handleLeave = (event: Event) => {
      const target = event.currentTarget as HTMLElement | null;
      if (!target || target.dataset.pixelDissolveDisabled === 'true') return;

      const existingTimeout = timeoutMap.get(target);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      target.querySelectorAll(':scope > [data-pixel-dissolve-overlay="true"]').forEach((node) => node.remove());

      const { overlay, pixels } = createPixels();
      overlay.dataset.pixelDissolveOverlay = 'true';

      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }

      target.appendChild(overlay);

      const shuffled = [...pixels].sort(() => Math.random() - 0.5);
      shuffled.forEach((pixel, index) => {
        const col = index % GRID_SIZE;
        const row = Math.floor(index / GRID_SIZE);
        const normalizedPosition = (col + row) / (GRID_SIZE * 2 - 2);
        const peakOpacity = 0.5 + normalizedPosition * 0.5;
        const enterDelayMs = index * PIXEL_STAGGER_MS;

        pixel.style.transition = `opacity ${PIXEL_RISE_MS}ms ease ${enterDelayMs}ms`;
        requestAnimationFrame(() => {
          pixel.style.opacity = `${peakOpacity}`;
        });

        window.setTimeout(() => {
          pixel.style.transition = `opacity ${PIXEL_FALL_MS}ms ease`;
          pixel.style.opacity = '0';
        }, enterDelayMs + PIXEL_RISE_MS);
      });

      const animationDurationMs = shuffled.length * PIXEL_STAGGER_MS + PIXEL_RISE_MS + PIXEL_FALL_MS;

      const cleanup = window.setTimeout(() => {
        overlay.style.transition = `opacity ${OVERLAY_FADE_MS}ms ease`;
        overlay.style.opacity = '0';

        window.setTimeout(() => {
          overlay.remove();
          timeoutMap.delete(target);
        }, OVERLAY_FADE_MS);
      }, animationDurationMs);

      timeoutMap.set(target, cleanup);
    };

    const wireCards = () => {
      document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((card) => {
        if (card.dataset.pixelDissolveBound === 'true') return;
        card.dataset.pixelDissolveBound = 'true';
        card.addEventListener('mouseleave', handleLeave);
      });
    };

    wireCards();

    const observer = new MutationObserver(() => {
      wireCards();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();

      document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((card) => {
        if (card.dataset.pixelDissolveBound === 'true') {
          card.removeEventListener('mouseleave', handleLeave);
          delete card.dataset.pixelDissolveBound;
        }

        const existingTimeout = timeoutMap.get(card);
        if (existingTimeout) {
          window.clearTimeout(existingTimeout);
          timeoutMap.delete(card);
        }

        card.querySelectorAll(':scope > [data-pixel-dissolve-overlay="true"]').forEach((node) => node.remove());
      });
    };
  }, []);

  return null;
}
