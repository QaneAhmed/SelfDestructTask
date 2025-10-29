/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: "#020617",
          900: "#0f172a",
          700: "#334155",
          600: "#475569",
          400: "#94a3b8",
        },
      },
      boxShadow: {
        glow: "0 20px 40px rgba(15, 23, 42, 0.16)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
