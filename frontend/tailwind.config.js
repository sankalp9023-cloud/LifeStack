/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#050811',
          850: '#0a0f1d',
          800: '#11182c',
        },
        navy: {
          950: '#0b0f19',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        cyan: {
          glow: '#27baff',
          dim: 'rgba(39, 186, 255, 0.15)',
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
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'cyan-glow': '0 0 20px rgba(39, 186, 255, 0.18)',
      },
    },
  },
  plugins: [],
};
