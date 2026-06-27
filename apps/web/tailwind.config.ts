import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e14',
        panel: '#111722',
        panel2: '#161e2b',
        edge: '#1e2937',
        accent: '#38bdf8',
        accent2: '#22d3ee',
        muted: '#7d8ba1',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        orb: '0 0 60px rgba(56, 189, 248, 0.15), 0 0 120px rgba(34, 211, 238, 0.08)',
      },
      backgroundImage: {
        'shell-gradient':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.15), transparent), linear-gradient(180deg, #0a0e14 0%, #0d1219 50%, #0a0e14 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
