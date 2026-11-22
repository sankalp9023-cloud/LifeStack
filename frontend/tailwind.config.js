/** @type {import('tailwindcss').Config} */
const navy = {
  50: '#eef2f8',
  100: '#dce4f0',
  200: '#c0cde0',
  300: '#9aacc9',
  400: '#758bb0',
  500: '#5b7197',
  600: '#465b7c',
  700: '#344663',
  800: '#24344e',
  900: '#16243a',
  950: '#0b1527',
};
const red = {
  50: '#fbf0f1',
  100: '#f5dfe2',
  200: '#e9bec4',
  300: '#d996a0',
  400: '#c66f7c',
  500: '#ad5361',
  600: '#8f3d4a',
  700: '#702e3a',
  800: '#50212b',
  900: '#341720',
  950: '#1e0e14',
};
const familyAliases = {
  blue: navy,
  cyan: navy,
  sky: navy,
  teal: navy,
  emerald: navy,
  green: navy,
  lime: navy,
  indigo: navy,
  violet: navy,
  purple: navy,
  fuchsia: navy,
  pink: red,
  rose: red,
  orange: red,
  amber: red,
  yellow: red,
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#080e1a',
          900: '#0c1525',
          850: '#142139',
          800: '#1c2b45',
        },
        navy,
        red,
        ...familyAliases,
        cyan: {
          ...navy,
          glow: '#9aacc9',
          dim: 'rgba(91, 113, 151, 0.2)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 16px 42px rgba(0, 0, 0, 0.28)',
        'cyan-glow': '0 0 20px rgba(91, 113, 151, 0.18)',
      },
    },
  },
  plugins: [],
};
