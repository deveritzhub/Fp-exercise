/** FP Exercise design tokens. Accent is a CSS variable so practices can brand it. */
const path = require('path');
module.exports = {
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      fontFamily: {
        // Brand fonts: Nanum Gothic for body text, Proza Libre for headings (self-hosted, no Google Fonts requests)
        sans: ['"Nanum Gothic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Proza Libre"', 'Georgia', 'ui-serif', 'serif'],
      },
      colors: {
        ink: { 950: '#1d1b10', 900: '#2b2819', 800: '#36331f', 700: '#413d28', 600: '#524e37', 500: '#5f5b47', 400: '#68644f', 300: '#bbb9a1', 200: '#dbd3c0', 100: '#e9e4db', 50: '#f3f0ea' },
        canvas: '#f7f5f0',
        // Functional Performance brand palette (brand sheet)
        brand: { wood: '#5b432b', army: '#413d28', olive: '#64614d', sage: '#bbb9a1', beach: '#dbd3c0', pearl: '#e9e4db' },
        line: '#e4dfd4',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
        },
        ok: { DEFAULT: '#3f6b4a', soft: '#e8eee5' },
        warn: { DEFAULT: '#7d5410', soft: '#f5ecdc' },
        bad: { DEFAULT: '#9a3b2c', soft: '#f6e6e1' },
        info: { DEFAULT: '#3c5a73', soft: '#e6edf1' },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(45, 40, 25, 0.05)',
        card: '0 1px 2px rgba(45, 40, 25, 0.04), 0 1px 3px rgba(45, 40, 25, 0.04)',
        pop: '0 12px 32px -8px rgba(45, 40, 25, 0.18), 0 2px 6px rgba(45, 40, 25, 0.06)',
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
