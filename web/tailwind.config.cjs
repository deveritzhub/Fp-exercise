/** FP Exercise design tokens. Accent is a CSS variable so practices can brand it. */
const path = require('path');
module.exports = {
  // Dark mode follows a class on <html> (lib/theme.ts): light, dark or the system setting.
  darkMode: 'class',
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      fontFamily: {
        // Inter for body text, labels, tables and numbers; Manrope for headings. Self-hosted (no Google Fonts requests).
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Manrope Variable"', 'Manrope', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Neutrals: dark slate green text (900) down to soft sage surfaces (50). 400 and darker pass AA as text on white and sage.
        // Theme colours are CSS variables (index.css), so dark mode swaps them in one place.
        ink: { 950: 'rgb(var(--ink-950) / <alpha-value>)', 900: 'rgb(var(--ink-900) / <alpha-value>)', 800: 'rgb(var(--ink-800) / <alpha-value>)', 700: 'rgb(var(--ink-700) / <alpha-value>)', 600: 'rgb(var(--ink-600) / <alpha-value>)', 500: 'rgb(var(--ink-500) / <alpha-value>)', 400: 'rgb(var(--ink-400) / <alpha-value>)', 300: 'rgb(var(--ink-300) / <alpha-value>)', 200: 'rgb(var(--ink-200) / <alpha-value>)', 100: 'rgb(var(--ink-100) / <alpha-value>)', 50: 'rgb(var(--ink-50) / <alpha-value>)' },
        canvas: 'rgb(var(--canvas) / <alpha-value>)', // Clinical Off-White page background
        line: 'rgb(var(--line) / <alpha-value>)', // Soft Sage borders
        sage: 'rgb(var(--sage) / <alpha-value>)', // Clinical Sage soft surfaces (selected rows, icon tiles)
        mist: 'rgb(var(--mist) / <alpha-value>)', // light sage sidebar
        surface: 'rgb(var(--surface) / <alpha-value>)', // cards and sheets (white in light mode)
        sand: { DEFAULT: '#d8ccb6', soft: 'rgb(var(--sand-soft) / <alpha-value>)', ink: 'rgb(var(--sand-ink) / <alpha-value>)' }, // subtle brand accent, never for status
        // Functional Performance brand palette (brand sheet), for brand surfaces only
        brand: { forest: '#29483c', dark: '#1d362d', wood: '#5b432b', army: '#413d28', olive: '#64614d', sand: '#d8ccb6' },
        // Primary interactions; CSS variables so a practice can brand them (see lib/accent.ts).
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
        },
        // Medical/status colours: independent of the brand so success never looks like a button.
        ok: { DEFAULT: 'rgb(var(--ok) / <alpha-value>)', soft: 'rgb(var(--ok-soft) / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--warn) / <alpha-value>)', soft: 'rgb(var(--warn-soft) / <alpha-value>)' },
        bad: { DEFAULT: 'rgb(var(--bad) / <alpha-value>)', soft: 'rgb(var(--bad-soft) / <alpha-value>)' },
        info: { DEFAULT: 'rgb(var(--info) / <alpha-value>)', soft: 'rgb(var(--info-soft) / <alpha-value>)' },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(20, 35, 28, 0.05)',
        card: '0 1px 2px rgba(20, 35, 28, 0.04), 0 2px 6px -2px rgba(20, 35, 28, 0.05)',
        lift: '0 2px 4px rgba(20, 35, 28, 0.04), 0 8px 20px -8px rgba(20, 35, 28, 0.12)',
        pop: '0 16px 40px -12px rgba(20, 35, 28, 0.22), 0 2px 6px rgba(20, 35, 28, 0.06)',
      },
      borderRadius: { lg: '0.625rem', xl: '0.75rem', '2xl': '0.875rem' },
      fontSize: { '2xs': ['0.75rem', { lineHeight: '1rem' }] },
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
