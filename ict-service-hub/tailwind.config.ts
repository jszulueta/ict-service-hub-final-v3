import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#F0F4FF',
          100: '#E0E9FF',
          200: '#C1D3FF',
          300: '#93B4FD',
          400: '#608EF9',
          500: '#3B68F2',
          600: '#2449E5',
          700: '#1C37CC',
          800: '#1B2EA6',
          900: '#1C2C83',
          950: '#0F172A',
        },
        gold: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        brand: {
          50: '#fce7f1',
          100: '#fad1e4',
          200: '#f4a4c8',
          300: '#ee71a7',
          400: '#e33e83',
          500: '#d61864',
          600: '#b50163',
          700: '#9e0155',
          800: '#830349',
          900: '#6d063e',
          950: '#420022',
        },
        liturgical: {
          white: '#F8FAFC',
          cream: '#F1F5F9',
          muted: '#E2E8F0',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        mono:    ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgba(15,23,42,0.08), 0 1px 2px -1px rgba(15,23,42,0.04)',
        'card-md': '0 4px 6px -1px rgba(15,23,42,0.10), 0 2px 4px -2px rgba(15,23,42,0.06)',
      },
      backgroundImage: {
        'admin-header': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        'user-hero':    'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217,119,6,0.4)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(217,119,6,0)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.3s ease-out both',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
