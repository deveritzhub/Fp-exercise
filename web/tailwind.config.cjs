/** FP Exercise design tokens. Accent is a CSS variable so practices can brand it. */
const path = require('path');
module.exports = {
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { 950: '#0b1210', 900: '#121b18', 800: '#1d2925', 700: '#2e3b36', 600: '#4a5651', 500: '#69736f', 400: '#8d9591', 300: '#b5bbb8', 200: '#d9ddda', 100: '#ebeeec', 50: '#f5f6f5' },
        canvas: '#f7f7f5',
        line: '#e6e7e3',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
        },
        ok: { DEFAULT: '#2f7a57', soft: '#e8f3ed' },
        warn: { DEFAULT: '#a86a12', soft: '#fbf1e1' },
        bad: { DEFAULT: '#b2453b', soft: '#f9e9e7' },
        info: { DEFAULT: '#33608f', soft: '#e8f0f8' },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(16, 24, 20, 0.05)',
        card: '0 1px 2px rgba(16, 24, 20, 0.04), 0 1px 3px rgba(16, 24, 20, 0.04)',
        pop: '0 12px 32px -8px rgba(16, 24, 20, 0.18), 0 2px 6px rgba(16, 24, 20, 0.06)',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-up': 'slide-up .22s cubic-bezier(.2,.8,.2,1)',
        'scale-in': 'scale-in .16s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
