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
          
            {/* SVG mask definition for the video backdrop shape */}
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                        <defs>
                                  <mask id="heroMask" maskContentUnits="objectBoundingBox">
                                              <rect width="1" height="1" fill="black" />
                                              <path
                                                              d="M0 0.1474 V0.9863 C0 0.9938 0.0038 0.9996 0.0085 0.9996 H0.9912 C0.9958 0.9996 1 0.9863 1 0.9863 V0.0581 C1 0.0506 0.9958 0.0444 0.9912 0.0444 H0.9255 C0.9208 0.0444 0.9165 0.0383 0.9165 0.0307 V0.0149 C0.9165 0.0074 0.9132 0.0013 0.9084 0.0013 L0.2060 0.0000 C0.2012 -0.0000 0.1975 0.0061 0.1975 0.0137 V0.0312 C0.1975 0.0387 0.1936 0.0448 0.1889 0.0448 H0.0915 C0.0868 0.0448 0.0830 0.0510 0.0830 0.0585 V0.1201 C0.0830 0.1276 0.0792 0.1337 0.0745 0.1337 H0.0085 C0.0038 0.1337 0 0.1399 0 0.1474 Z"
                                                              fill="white"
                                                            />
                                  </mask>
                        </defs>
                </svg>
          
            {/* Video backdrop with mask — shown in both dark and light modes */}
                <div className={`video-backdrop-container ${isDark ? 'video-backdrop-dark' : 'video-backdrop-light'}`}>
                        <div className="video-backdrop-masked">
                                  <video
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="video-backdrop-video"
                                              >
                                              <source src="/earth-from-space.1920x1080.mp4" type="video/mp4" />
                                  </video>
                        </div>
                  {/* Gradient overlays for blending video edges into the background */}
                        <div className="video-backdrop-overlays">
                                  <div className="video-backdrop-gradient-bottom" />
                                  <div className="video-backdrop-gradient-right" />
                                  <div className="video-backdrop-gradient-vignette" />
                        </div>
                </div>
          
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
                              <div className="absolute top-[8%] left-[10%] w-[380px] h-[380px] rounded-full bg-gradient-to-br from-coral-400/10 to-amber-300/8 blur-3xl animate-float-slow" />
                              <div className="absolute top-[56%] right-[12%] w-[460px] h-[460px] rounded-full bg-gradient-to-br from-purple-400/8 to-cyan-300/6 blur-3xl animate-float-slower" />
                              <div className="absolute bottom-[8%] left-[34%] w-[340px] h-[340px] rounded-full bg-gradient-to-br from-sky-300/6 to-indigo-400/8 blur-3xl animate-float-medium" />
                              <div className="absolute top-[28%] right-[38%] w-[320px] h-[320px] rounded-full bg-gradient-to-br from-rose-300/8 to-fuchsia-300/6 blur-3xl animate-float-slow" />
                    </div>
                )}
          </>
        );
      };
