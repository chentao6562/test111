/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#e63333",
        "primary-dark": "#cc2929",
        "primary-light": "#ffe5e5",
        "background-light": "#f8f6f6",
        "background-dark": "#211111",
        "card-light": "#ffffff",
        "card-dark": "#2d1b1b",
        "text-main": "#1b0e0e",
        "text-secondary": "#964f4f",
        "border-color": "#e6d0d0",
        "gold": "#D4AF37",
        "warm-white": "#fffbf0",
      },
      fontFamily: {
        "display": ["Manrope", "Noto Sans SC", "sans-serif"],
        "body": ["Manrope", "Noto Sans SC", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
