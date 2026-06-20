import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './contexto/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['var(--font-bebas)', 'sans-serif'],
      },
      colors: {
        chefsy: {
          DEFAULT: 'var(--chefsy-main)',
          50: 'var(--color-chefsy-50)',
          100: 'var(--color-chefsy-100)',
          200: 'var(--color-chefsy-200)',
          300: 'var(--color-chefsy-300)',
          400: 'var(--color-chefsy-400)',
          500: 'var(--color-chefsy-500)',
          600: 'var(--color-chefsy-600)',
          700: 'var(--color-chefsy-700)',
          800: 'var(--color-chefsy-800)',
          900: 'var(--color-chefsy-900)',
        },
      },
      keyframes: {
        'logo-bounce': {
          '0%, 100%': { transform: 'translateY(-15%) scale(1.05)' },
          '50%': { transform: 'translateY(0) scale(0.95)' },
        }
      },
      animation: {
        'logo-bounce': 'logo-bounce 1.5s ease-in-out infinite',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
