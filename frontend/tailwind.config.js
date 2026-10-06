/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        corrientes: {
          blue: '#1e3a8a',
          light: '#3b82f6',
          gold: '#eab308',
          dark: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
