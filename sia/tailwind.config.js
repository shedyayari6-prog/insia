/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#171A1F', soft: '#4B4F57' },
        paper: { DEFAULT: '#F7F6F2', deep: '#EFEDE6' },
        sand: { DEFAULT: '#D8CBB8', light: '#E7DFD2' },
        gold: { DEFAULT: '#B99A5B', dark: '#8F7640' },
        slate: { DEFAULT: '#777B83' },
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px', md: '6px', lg: '8px' },
      boxShadow: { soft: '0 1px 2px rgba(23,26,31,0.06)', lift: '0 8px 24px -12px rgba(23,26,31,0.18)' },
    },
  },
  plugins: [],
}
