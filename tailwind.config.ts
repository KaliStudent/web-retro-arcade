import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "0.625rem",
        md: "0.45rem",
        sm: "0.25rem",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        // 80s/90s Synthwave Palette
        neon: {
          blue: "#00f0ff",
          cyan: "#00f0ff",
          orange: "#ff7700",
          sunset: "#ff5e36",
          green: "#39ff14",
          lime: "#39ff14",
          pink: "#ff007f",
          magenta: "#ff00a0",
          yellow: "#ffe600",
          purple: "#9d4edd",
          dark: "#080914",
          surface: "#0e1222",
          elevated: "#151b32",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"],
        orbitron: ["'Orbitron'", "sans-serif"],
        arcade: ["'Press Start 2P'", "monospace"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        "neon-blue": "0 0 15px rgba(0, 240, 255, 0.45), 0 0 30px rgba(0, 240, 255, 0.2)",
        "neon-blue-lg": "0 0 25px rgba(0, 240, 255, 0.65), 0 0 50px rgba(0, 240, 255, 0.3)",
        "neon-orange": "0 0 15px rgba(255, 119, 0, 0.45), 0 0 30px rgba(255, 119, 0, 0.2)",
        "neon-green": "0 0 15px rgba(57, 255, 20, 0.45), 0 0 30px rgba(57, 255, 20, 0.2)",
        "neon-pink": "0 0 15px rgba(255, 0, 127, 0.45), 0 0 30px rgba(255, 0, 127, 0.2)",
        "arcade-inset": "inset 0 0 20px rgba(0, 240, 255, 0.2)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 12px rgba(0, 240, 255, 0.8))" },
          "50%": { opacity: "0.75", filter: "drop-shadow(0 0 4px rgba(0, 240, 255, 0.4))" },
        },
        "synth-grid": {
          "0%": { transform: "perspective(300px) rotateX(60deg) translateY(0)" },
          "100%": { transform: "perspective(300px) rotateX(60deg) translateY(40px)" },
        },
        "scanline": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "synth-grid": "synth-grid 2s linear infinite",
        "scanline": "scanline 8s linear infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
} satisfies Config;
