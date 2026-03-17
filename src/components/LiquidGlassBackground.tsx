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

      {/* Noise + glow overlay */}
      <div className={isDark ? 'liquid-glass-overlay liquid-glass-overlay-dark' : 'liquid-glass-overlay'} />

      {/* Floating orbs for depth - keep for both modes */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div
          className={`absolute top-[8%] left-[10%] w-[380px] h-[380px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-fuchsia-500/35 to-violet-600/20'
              : 'bg-gradient-to-br from-coral-400/35 to-amber-300/25'
          } blur-3xl animate-float-slow`}
        />
        <div
          className={`absolute top-[56%] right-[12%] w-[460px] h-[460px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-cyan-500/30 to-blue-700/25'
              : 'bg-gradient-to-br from-purple-400/25 to-cyan-300/20'
          } blur-3xl animate-float-slower`}
        />
        <div
          className={`absolute bottom-[8%] left-[34%] w-[340px] h-[340px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-orange-500/25 to-fuchsia-500/25'
              : 'bg-gradient-to-br from-sky-300/20 to-indigo-400/25'
          } blur-3xl animate-float-medium`}
        />

        <div
          className={`absolute top-[28%] right-[38%] w-[320px] h-[320px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-amber-400/20 to-orange-600/20'
              : 'bg-gradient-to-br from-rose-300/25 to-fuchsia-300/20'
          } blur-3xl animate-float-slow`}
        />
      </div>
    </>
  );
};
