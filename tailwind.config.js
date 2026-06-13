/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#050816',
        primary: '#00F0FF',
        secondary: '#7C3AED',
        foreground: '#F8FAFC',
        muted: '#94A3B8',
        glass: 'rgba(255,255,255,0.04)',
        borderGlass: 'rgba(255,255,255,0.08)',
      },
      boxShadow: {
        premium: '0 24px 90px rgba(0, 0, 0, 0.45)',
        glow: '0 0 42px rgba(0, 240, 255, 0.18)',
        violetGlow: '0 0 54px rgba(124, 58, 237, 0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
