import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './contexto/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chefsy: {
          DEFAULT: '#2A6348',
          50: '#f0f6f3',
          100: '#dce8e2',
          200: '#b8d1c5',
          300: '#8fb39f',
          400: '#5d9175',
          500: '#3d7a5c',
          600: '#2A6348',
          700: '#234f3a',
          800: '#1a3d2e',
          900: '#153026',
        },
      },
    },
  },
  plugins: [],
}

export default config
