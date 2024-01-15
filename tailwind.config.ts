import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  prefix: "",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        active: "#020815ba",
        correct: {
          DEFAULT: "hsl(var(--tile-correct))",
          contrast: "hsl(var(--tile-correct-contrast))"
        },
        present: {
          DEFAULT: "hsl(var(--tile-present))",
          contrast: "hsl(var(--tile-present-contrast))",
        },
        absent: {
          DEFAULT: "hsl(var(--tile-absent))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      gridTemplateColumns: {
        keyboard: "repeat(20, minmax(0, 2rem))",
        board: "repeat(5, 4em)",
        example: "repeat(5, 3em)",
      },
      gridTemplateRows: {
        default: "repeat(6, 4em)",
        duo: "repeat(7, 4em)",
        trio: "repeat(8, 4em)",
        four: "repeat(9, 4em)",
        example: "repeat(1, 3em)",
      },
      padding: {
        "1/1": "100%",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
