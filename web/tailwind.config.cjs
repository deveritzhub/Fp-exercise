/** FP Exercise design tokens. Accent is a CSS variable so practices can brand it. */
const path = require('path');
module.exports = {
  // Dark mode follows a class on <html> (lib/theme.ts): light, dark or the system setting.
  darkMode: 'class',
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      // A phone held sideways: wide and low. Used by the village so its controls fit.
      screens: { land: { raw: '(orientation: landscape) and (max-height: 520px)' } },
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
        // Layered, soft and deep: a hairline, a contact shadow and a wide ambient one.
        xs: '0 1px 2px rgba(20, 35, 28, 0.06)',
        card: '0 0 0 1px rgba(23, 37, 31, 0.025), 0 1px 2px rgba(23, 37, 31, 0.05), 0 8px 18px -10px rgba(23, 37, 31, 0.10), 0 26px 48px -28px rgba(23, 37, 31, 0.22)',
        lift: '0 0 0 1px rgba(20, 35, 28, 0.03), 0 2px 4px rgba(20, 35, 28, 0.05), 0 14px 28px -12px rgba(20, 35, 28, 0.18), 0 30px 56px -30px rgba(20, 35, 28, 0.24)',
        pop: '0 0 0 1px rgba(20, 35, 28, 0.04), 0 4px 10px rgba(20, 35, 28, 0.08), 0 24px 56px -16px rgba(20, 35, 28, 0.34)',
        // The floating tab bar of the patient app.
        dock: '0 0 0 1px rgba(20, 35, 28, 0.05), 0 2px 6px rgba(20, 35, 28, 0.06), 0 18px 40px -14px rgba(20, 35, 28, 0.30)',
        // Primary buttons: a lit top edge and a glow in the accent colour underneath.
        btn: 'inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1px 2px rgba(20, 35, 28, 0.22), 0 10px 20px -10px rgb(var(--accent) / 0.55)',
        gold: 'inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 1px 2px rgba(80, 55, 0, 0.25), 0 12px 26px -10px rgba(227, 182, 85, 0.75)',
      },
      // Buttons and fields 14, cards 20, the lead card 24.
      borderRadius: { lg: '0.625rem', xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.5rem' },
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
