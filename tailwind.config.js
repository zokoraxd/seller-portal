/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // RGB channels in CSS variables so opacity modifiers (bg-brand/40) work
        brand: {
          DEFAULT: 'rgb(var(--brand-primary) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
          border: 'rgb(var(--brand-border) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        drawer: '-8px 0 32px -4px rgba(15, 23, 42, 0.14)',
      },
    },
  },
  plugins: [],
}
