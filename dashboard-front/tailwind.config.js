/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
        background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        ink: "#13201d", paper: "#f4f3ed", evergreen: "#23845e", surface: "#fcfcf8",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 3px)", sm: "calc(var(--radius) - 6px)" },
      boxShadow: {
        editorial: "0 18px 55px -28px rgb(19 32 29 / 0.35)",
        lift: "0 22px 45px -25px rgb(19 32 29 / 0.42)",
      },
      fontFamily: { sans: ["Inter", "Aptos", "Segoe UI", "system-ui", "sans-serif"] },
      transitionTimingFunction: { editorial: "var(--ease-editorial)" },
    },
  },
  plugins: [],
};
