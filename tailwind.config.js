/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#000000',
          surface: '#1C1C1E',
          elevated: '#2C2C2E',
          secondary: '#3A3A3C',
          border: '#38383A',
          text: {
            primary: '#FFFFFF',
            secondary: '#8E8E93',
            tertiary: '#636366'
          }
        }
      }
    },
  },
  plugins: [],
  safelist: [
    'bg-yellow-500',
    'bg-yellow-200',
    'bg-blue-200',
    'bg-red-200',
    'bg-green-200',
    'bg-yellow-900',
    'text-yellow-200',
    'text-yellow-600',
    'bg-amber-500',
    'bg-amber-200',
    'bg-amber-900',
    'text-amber-200',
    'text-amber-600',
  ],
};