/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legado — mantido como rede de seguranca para qualquer uso residual de `primary-*`.
        // A paleta viva do produto agora vive nas CSS custom properties (--accent, --surface, etc.)
        // definidas em src/index.css e consumidas via classes arbitrarias `bg-[var(--x)]`.
        primary: {
          50: '#e6fbf5',
          100: '#c2f6e5',
          200: '#8fedd0',
          300: '#5ce3ba',
          400: '#2eecab',
          500: '#00E0A4',
          600: '#00b884',
          700: '#039169',
          800: '#0a7154',
          900: '#0b5d46',
          950: '#062018',
        },
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
    },
  },
  safelist: [
    {
      pattern: /bg-primary-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern: /text-primary-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern: /border-primary-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
  ],
  plugins: [],
}
