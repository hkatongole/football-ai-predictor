/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eefcf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        pitch: { 900: '#0f172a', 800: '#111c34', 700: '#16213e' },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.35)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
