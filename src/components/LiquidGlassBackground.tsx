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
            backgroundImage: 'url(/Aerial Mountain River Photo.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}

      {/* Overlay with subtle radial gradients */}
      <div className="liquid-glass-overlay" />

      {/* Floating orbs for depth - keep for both modes */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div
          className={`absolute top-[10%] left-[15%] w-[300px] h-[300px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20'
              : 'bg-gradient-to-br from-blue-400/20 to-sky-300/20'
          } blur-3xl animate-float-slow`}
        />
        <div
          className={`absolute top-[60%] right-[20%] w-[400px] h-[400px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20'
              : 'bg-gradient-to-br from-orange-500/15 to-amber-600/15'
          } blur-3xl animate-float-slower`}
        />
        <div
          className={`absolute bottom-[15%] left-[30%] w-[250px] h-[250px] rounded-full ${
            isDark
              ? 'bg-gradient-to-br from-pink-600/20 to-purple-600/20'
              : 'bg-gradient-to-br from-amber-400/15 to-orange-500/15'
          } blur-3xl animate-float-medium`}
        />
      </div>
    </>
  );
};
