/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a8f8',
          500: '#0e8ce9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b85',
          900: '#0c3f6e',
          950: '#082849',
        },
        municipal: {
          dark: '#0f172a',
          navy: '#1e293b',
          surface: '#f8fafc',
          border: '#e2e8f0',
        },
        status: {
          reported: {
            bg: '#fef3c7',
            text: '#92400e',
            border: '#fde68a',
            dot: '#f59e0b',
          },
          verified: {
            bg: '#dbeafe',
            text: '#1e40af',
            border: '#bfdbfe',
            dot: '#2563eb',
          },
          assigned: {
            bg: '#ede9fe',
            text: '#5b21b6',
            border: '#ddd6fe',
            dot: '#7c3aed',
          },
          in_progress: {
            bg: '#ffedd5',
            text: '#9a3412',
            border: '#fed7aa',
            dot: '#ea580c',
          },
          resolved: {
            bg: '#d1fae5',
            text: '#065f46',
            border: '#a7f3d0',
            dot: '#10b981',
          },
          rejected: {
            bg: '#ffe4e6',
            text: '#9f1239',
            border: '#fecdd3',
            dot: '#f43f5e',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
