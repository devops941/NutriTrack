/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './frontend/index.html',
    './frontend/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#244C3B',
          dark: '#1B3A2C',
          light: '#2E5E49',
          50: '#F0F5F2',
          100: '#DDE8E2',
          200: '#C2D6CB',
          300: '#9EBFAD',
          400: '#6FA088',
          500: '#478168',
          600: '#346651',
          700: '#244C3B',
          800: '#1B3A2C',
          900: '#13281E',
        },
        sage: {
          DEFAULT: '#A9BDA9',
          light: '#D3DFD3',
          dark: '#7B947B',
          50: '#F5F8F5',
          100: '#E6ECE6',
          200: '#D3DFD3',
          300: '#BDCEBD',
          400: '#A9BDA9',
          500: '#8FA88F',
          600: '#7B947B',
          700: '#5F755F',
          800: '#465646',
          900: '#2E392E',
        },
        ivory: {
          DEFAULT: '#F7F6F0',
          dark: '#ECEAE1',
          surface: '#FFFFFF',
        },
        charcoal: {
          DEFAULT: '#252A27',
          light: '#3C433F',
          muted: '#525C56',
        },
        terracotta: {
          DEFAULT: '#C97857',
          light: '#E3997D',
          dark: '#A65A3D',
        },
        mutedGrey: {
          DEFAULT: '#7E8982',
          light: '#A4ADA7',
          border: '#D8DDD9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        editorial: ['Newsreader', 'Georgia', 'serif'],
      },
      boxShadow: {
        organic: '0 1px 3px rgba(36, 76, 59, 0.05), 0 4px 12px rgba(36, 76, 59, 0.03)',
        card: '0 2px 8px rgba(37, 42, 39, 0.04)',
      },
    },
  },
  plugins: [],
};
