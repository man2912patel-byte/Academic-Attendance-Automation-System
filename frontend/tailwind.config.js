/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E3D59",
        secondary: "#17b890",
        dark: "#121212",
        light: "#F8F9FA",
      }
    },
  },
  plugins: [],
}
