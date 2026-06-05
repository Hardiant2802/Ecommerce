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
          50: '#FFF1F1',
          100: '#FFDDDD',
          200: '#FFC0C0',
          300: '#FF9494',
          400: '#FF5252',
          500: '#FF1A1A',
          600: '#F50000',
          700: '#E60000',
          800: '#D40000',
          900: '#C20000',
          950: '#9E0000',
        },
        gold: {
          DEFAULT: '#FF1A1A',
          dark: '#F50000',
          light: '#FF9494',
        },
      },
    },
  },
  plugins: [],
};
