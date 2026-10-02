/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16181d', soft: '#2a2d35', muted: '#5b606b' },
        sand: { DEFAULT: '#f5f1ea', deep: '#e9e2d6' },
        brass: { DEFAULT: '#b8864b', dark: '#9a6d36', light: '#d9b98c' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 10px 30px -12px rgba(22,24,29,.25)' },
    },
  },
  plugins: [],
}
