/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF9E6',
          100: '#FFF3CC',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#D4A03A',
          600: '#B8860B',
          700: '#996B00',
          800: '#7A5500',
          900: '#5C4000',
        },
        gold: {
          DEFAULT: '#D4A03A',
          dark: '#B8860B',
          light: '#FFD966',
        },
      },
    },
  },
  plugins: [],
};
