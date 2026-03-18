import { useTheme } from '../contexts/ThemeContext';

export const LiquidGlassBackground = () => {
  const { isDark } = useTheme();

  return (
    <>
      {/* Layered gradient mesh background */}
      {isDark ? (
        <div className="liquid-glass-bg liquid-glass-bg-dark" />
      ) : (
        <div className="liquid-glass-bg" />
      )}

      <div className={isDark ? 'liquid-glass-photo-backdrop liquid-glass-photo-backdrop-dark' : 'liquid-glass-photo-backdrop'} />

      {/* Noise + glow overlay */}
      <div className={isDark ? 'liquid-glass-overlay liquid-glass-overlay-dark' : 'liquid-glass-overlay'} />
      <div className={isDark ? 'liquid-glass-vignette liquid-glass-vignette-dark' : 'liquid-glass-vignette'} />

      {isDark && (
        <>
          <div className="futuristic-grid-overlay" />
          <div className="futuristic-spotlight" />
        </>
      )}

      {/* Floating orbs for extra depth in light mode only so the custom dark
          geometric background remains visible and uncluttered. */}
      {!isDark && (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div
            className="absolute top-[8%] left-[10%] w-[380px] h-[380px] rounded-full bg-gradient-to-br from-coral-400/35 to-amber-300/25 blur-3xl animate-float-slow"
          />
          <div
            className="absolute top-[56%] right-[12%] w-[460px] h-[460px] rounded-full bg-gradient-to-br from-purple-400/25 to-cyan-300/20 blur-3xl animate-float-slower"
          />
          <div
            className="absolute bottom-[8%] left-[34%] w-[340px] h-[340px] rounded-full bg-gradient-to-br from-sky-300/20 to-indigo-400/25 blur-3xl animate-float-medium"
          />

          <div
            className="absolute top-[28%] right-[38%] w-[320px] h-[320px] rounded-full bg-gradient-to-br from-rose-300/25 to-fuchsia-300/20 blur-3xl animate-float-slow"
          />
        </div>
      )}
    </>
  );
};
