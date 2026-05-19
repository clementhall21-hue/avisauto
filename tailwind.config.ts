import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0b0f1e',
        'navy-mid': '#111827',
        'navy-light': '#1a2340',
        'white-custom': '#e8eaf6',
        'green-custom': '#34d399',
        'green-light': '#bbf7d0',
        'green-muted': '#6ee7b7',
        'indigo-custom': '#6366f1',
        'violet-custom': '#a78bfa',
        'cyan-custom': '#06b6d4',
        'amber-custom': '#f59e0b',
        'rose-custom': '#f43f5e',
        'text-muted': '#8892b0',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366f1, #7c3aed)',
        'gradient-logo': 'linear-gradient(135deg, #818cf8, #06b6d4)',
        'gradient-hero': 'linear-gradient(135deg, #818cf8 0%, #06b6d4 50%, #34d399 100%)',
      },
      animation: {
        'pulse-dot': 'pulseDot 2s infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.6)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      borderColor: {
        'card': 'rgba(255,255,255,0.07)',
      },
      backgroundColor: {
        'card': 'rgba(255,255,255,0.03)',
      },
    },
  },
  plugins: [],
}

export default config
