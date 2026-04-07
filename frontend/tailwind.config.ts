import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { primary: { DEFAULT: '#1e293b' }, accent: { DEFAULT: '#3b82f6' } }, fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } },
  plugins: [],
} satisfies Config;