/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        "border-default": "var(--border-default)",
        "border-accent": "var(--border-accent)",
        // Premium accent colors
        accent: {
          light: "#3b82f6", // Blue
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
        success: "#10b981", // Emerald
        warning: "#f59e0b", // Amber
        danger: "#ef4444",  // Rose
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
}
