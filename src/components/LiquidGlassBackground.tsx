import { useTheme } from '../contexts/ThemeContext';

export const LiquidGlassBackground = () => {
  const { isDark } = useTheme();

  return (
    <>
      {/* Animated gradient background for dark mode, photo for light mode */}
      {isDark ? (
        <div className="liquid-glass-bg liquid-glass-bg-dark" />
      ) : (
        <div
          className="fixed top-0 left-0 w-full h-full z-[-2] overflow-hidden"
          style={{
            backgroundImage: `url(/Aerial Mountain River Photo.jpg), linear-gradient(135deg,
              #1a2332 0%,
              #2d3e50 15%,
              #4a6fa5 30%,
              #7b9cc4 45%,
              #c9d5e8 60%,
              #e8d4c8 75%,
              #d4a898 85%,
              #b88878 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}

      {/* Overlay with subtle radial gradients */}
      <div className="liquid-glass-overlay" />

      {/* Floating orbs for depth - warm tones in dark mode */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        {/* Primary warm glow - coral/copper tones */}
        <div
          className={`absolute top-[10%] left-[15%] w-[300px] h-[300px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-[#E07A5F]/15 to-[#C4856C]/10'
              : 'bg-gradient-to-br from-blue-400/20 to-sky-300/20'
          } blur-3xl animate-float-slow`}
        />
        {/* Secondary warm glow - coral to purple */}
        <div
          className={`absolute top-[60%] right-[20%] w-[400px] h-[400px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-[#D4967D]/12 to-[#7C5CBF]/8'
              : 'bg-gradient-to-br from-orange-500/15 to-amber-600/15'
          } blur-3xl animate-float-slower`}
        />
        {/* Tertiary ambient glow - subtle purple warmth */}
        <div
          className={`absolute bottom-[15%] left-[30%] w-[250px] h-[250px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-[#7C5CBF]/10 to-[#E07A5F]/8'
              : 'bg-gradient-to-br from-amber-400/15 to-orange-500/15'
          } blur-3xl animate-float-medium`}
        />
      </div>
    </>
  );
};
