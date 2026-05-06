/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gpai: {
          bg: 'var(--gpai-bg)',
          surface: 'var(--gpai-surface)',
          'surface-2': 'var(--gpai-surface-2)',
          border: 'var(--gpai-border)',
          text: 'var(--gpai-text)',
          muted: 'var(--gpai-muted)',
          primary: 'var(--gpai-primary)',
          'primary-hover': 'var(--gpai-primary-hover)',
          'primary-soft': 'var(--gpai-primary-soft)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
