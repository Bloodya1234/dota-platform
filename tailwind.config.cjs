const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/globals.css',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0d0d',
        card: '#111111',
        surface: '#121212',
        'gray-soft': '#1e1e1e',

        primary: '#e0f7fa',
        foreground: '#ffffff',
        muted: '#999999',
        border: '#222222',

        accent: '#00ffe5',
        'accent-dark': '#00d4b5',
        danger: '#ff0066',

        green: {
          300: '#00ffbf',
          400: '#00d2a8',
          600: '#008e70',
        },
        pink: {
          300: '#ff66c4',
          400: '#ff4e8b',
          600: '#a0255f',
        },
        orange: {
          400: '#ff9900',
        },

        // ✅ Custom win/loss colors from image
        win: '#00ffab',
        loss: '#ff7c9c',
      },
      boxShadow: {
        neon: '0 0 10px #00ffe5, 0 0 20px #00ffe5',
        'neon-accent': '0 0 12px #00ffe5',
        'neon-danger': '0 0 10px #ff0066',
        'neon-orange': '0 0 10px #ff9900',
      },
      fontFamily: {
        orbitron: ['Orbitron', ...fontFamily.sans],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        hex: '12px',
      },
      textColor: {
        primary: '#e0f7fa',
        accent: '#00ffe5',
        danger: '#ff0066',
        win: '#00ffab',   // ✅ Added
        loss: '#ff7c9c',  // ✅ Added
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 8px #00ffc3, 0 0 16px #00ffc3',
          },
          '50%': {
            boxShadow: '0 0 16px #00ffc3, 0 0 32px #00ffc3',
          },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2s infinite',
      },
    },
  },

  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.text-glow': {
          textShadow: '0 0 6px #00ffc3, 0 0 12px #00ffc3',
        },
        '.btn-glow': {
          boxShadow: '0 0 8px #00ffc3, 0 0 16px #00ffc3',
        },
        '.glow-panel': {
          boxShadow: '0 0 10px rgba(0,255,227,0.2), 0 0 20px rgba(0,255,227,0.1)',
        },
        '.hover-glow:hover': {
          boxShadow: '0 0 8px rgba(0,255,227,0.5), 0 0 16px rgba(0,255,227,0.4)',
          transition: 'box-shadow 0.3s ease',
        },
        '.clip-hex': {
          clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
        },
      });
    },
  ],
};
