/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        titan: {
          dark: '#0B0F19',
          card: '#151D30',
          border: '#23304E',
          primary: '#3B82F6',
          accent: '#10B981',
          muted: '#94A3B8',
          text: '#F8FAFC'
        }
      }
    },
  },
  plugins: [],
}
