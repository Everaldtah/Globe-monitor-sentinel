/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#030810', surface: '#0a1628', panel: '#0f2137' },
        accent: { cyan: '#00d4ff', indigo: '#6366f1', amber: '#f59e0b', danger: '#ef4444', success: '#10b981' },
        border: '#1e3a5f',
        muted: '#64748b',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
