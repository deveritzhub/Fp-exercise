/** FP Exercise design tokens. Accent is a CSS variable so practices can brand it. */
const path = require('path');
module.exports = {
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
        ink: { 950: '#141c18', 900: '#202b26', 800: '#2a3731', 700: '#34433c', 600: '#46554e', 500: '#55635c', 400: '#5d6a64', 300: '#b5c1ba', 200: '#d3dcd6', 100: '#e8eee9', 50: '#f1f5f2' },
        canvas: '#f7f9f7', // Clinical Off-White page background
        line: '#e1e8e2', // Soft Sage borders
        sage: '#e6eee8', // Clinical Sage soft surfaces (sidebar, selected rows)
        sand: { DEFAULT: '#d8ccb6', soft: '#f3efe7', ink: '#5b4a2e' }, // subtle brand accent, never for status
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
        ok: { DEFAULT: '#1b6e45', soft: '#e5f3ea' },
        warn: { DEFAULT: '#8a5a00', soft: '#fbf0d9' },
        bad: { DEFAULT: '#b42318', soft: '#fdebe9' },
        info: { DEFAULT: '#1d5f99', soft: '#e7f0f9' },
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
