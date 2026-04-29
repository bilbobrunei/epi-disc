import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-open-sans)', 'sans-serif'],
        heading: ['var(--font-poppins)', 'sans-serif'],
      },
      colors: {
        disc: {
          d: '#52C272',
          'D-text': '#1a5c30',
          i: '#F5D04A',
          'I-text': '#5a4200',
          s: '#F2557A',
          'S-text': '#6b1030',
          c: '#5B9BD5',
          'C-text': '#0a2d5a',
        },
        brand: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          border: '#EBEBEB',
          text: '#1C1C1C',
          muted: '#6B6B6B',
          dark: '#0d1117',
          'dark-card': '#111722',
          'dark-border': '#1e2a3a',
        },
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(50px) scale(0.82)', opacity: '0' },
          '55%': { transform: 'translateY(-7px) scale(1.04)', opacity: '1' },
          '75%': { transform: 'translateY(2px) scale(0.99)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'badge-pop': {
          '0%': { transform: 'scale(0) rotate(-15deg)', opacity: '0' },
          '60%': { transform: 'scale(1.25) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'emoji-in': {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
          '65%': { transform: 'scale(1.2) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'fade-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        'ring-out': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'num-pop': {
          '0%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        toast: {
          '0%': { transform: 'translateX(115%)', opacity: '0' },
          '12%': { transform: 'translateX(-4%)', opacity: '1' },
          '80%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(115%)', opacity: '0' },
        },
        'adjective-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'badge-pop': 'badge-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'emoji-in': 'emoji-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'fade-up': 'fade-up 0.4s ease forwards',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'ring-out': 'ring-out 1.8s ease-out infinite',
        'ring-out-delay': 'ring-out 1.8s ease-out 0.6s infinite',
        'num-pop': 'num-pop 0.35s ease forwards',
        toast: 'toast 3.2s ease forwards',
        'adjective-pop': 'adjective-pop 0.2s ease',
      },
    },
  },
  plugins: [],
}

export default config
