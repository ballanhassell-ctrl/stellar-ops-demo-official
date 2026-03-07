/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      colors: {
        // Warm Minimalist Theme Colors (inspired by modern interior design)
        warm: {
          // Light mode
          'cream': '#FAF8F5',
          'cream-dark': '#F5F3EF',
          'beige': '#F0EDE7',
          'beige-dark': '#E8E3DB',
          'sand': '#D4CFC7',
          'brown-light': '#8B7F77',
          'brown': '#6B5D52',
          'brown-dark': '#8B7355',
          'gold': '#B8976A',
          'gold-hover': '#A68658',
          // Dark mode
          'charcoal': '#1A1614',
          'charcoal-light': '#211D1A',
          'slate': '#2D2622',
          'slate-light': '#3D3530',
          'slate-dark': '#4A403A',
          'copper': '#D4A574',
          'copper-light': '#E6B886',
        },
        // Stellar Consults Brand Colors
        purple: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#7C5CBF', // Main Purple - Stellar Brand
          600: '#6D51AA',
          700: '#5B4291',
          800: '#4A3678',
          900: '#3A2B5F',
          950: '#2A1F46',
        },
        coral: {
          50: '#FEF2F0',
          100: '#FDE5E1',
          200: '#FBCBC3',
          300: '#F8AFA4',
          400: '#F49486',
          500: '#E07A5F', // Main Coral - Stellar Brand
          600: '#D65E47',
          700: '#B34A35',
          800: '#903B2A',
          900: '#6D2C20',
          950: '#4A1D15',
        },
        // Keep primary for backwards compatibility but map to purple
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#7C5CBF',
          600: '#6D51AA',
          700: '#5B4291',
          800: '#4A3678',
          900: '#3A2B5F',
        },
        emerald: {
          500: '#00D4AA',
          600: '#00B894',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 92, 191, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(124, 92, 191, 0.8)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 16px 48px 0 rgba(31, 38, 135, 0.2)',
        'inner-glass': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)',
        'glow-primary': '0 0 20px rgba(124, 92, 191, 0.5)', // Purple glow
        'glow-purple': '0 0 20px rgba(124, 92, 191, 0.5)',
        'glow-coral': '0 0 20px rgba(224, 122, 95, 0.5)',
      },
    },
  },
  plugins: [],
}
