export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          50: '#FDFCF7',
          100: '#FDF6E3',
          200: '#E5C06A',
          300: '#CC9B21',
          400: '#21B8CC',
          500: '#21B8CC',
          600: '#4A5459',
          700: '#4A5459',
          800: '#002B36',
          900: '#002B36',
          950: '#002B36',
        },
      },
      fontFamily: {
        vault: ['"Segoe UI Semilight"', 'Inter', 'system-ui'],
      },
    },
  },
  plugins: [],
}
