import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aquila: {
          50:  "#f2f4f7",
          100: "#e4e9ef",
          200: "#c5d0dc",
          300: "#9fb0c2",
          400: "#728ea3",
          500: "#547086",
          600: "#445d72",
          700: "#3d4f63",
          800: "#2f3d4d",
          900: "#1f2a35",
        },
        coral: {
          50:  "#fff3f0",
          100: "#ffe3db",
          200: "#ffc4b4",
          300: "#ff9d87",
          400: "#ff6e4e",
          500: "#e85535",
          600: "#d0401e",
          700: "#ad3219",
          800: "#8e2a17",
          900: "#742416",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":     "fadeIn 0.5s ease-out both",
        "slide-up":    "slideUp 0.55s cubic-bezier(0.16,1,0.3,1) both",
        "slide-down":  "slideDown 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":    "scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "float":       "float 5s ease-in-out infinite",
        "blob":        "blob 8s ease-in-out infinite",
        "blob-slow":   "blob 12s ease-in-out infinite",
        "shimmer":     "shimmer 2.5s linear infinite",
        "pulse-ring":  "pulseRing 2s ease-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":      { transform: "translateY(-10px) rotate(1deg)" },
          "66%":      { transform: "translateY(-4px) rotate(-1deg)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%":      { transform: "translate(20px, -20px) scale(1.08)" },
          "66%":      { transform: "translate(-15px, 10px) scale(0.95)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseRing: {
          "0%":   { transform: "scale(1)",    opacity: "0.6" },
          "70%":  { transform: "scale(1.5)",  opacity: "0" },
          "100%": { transform: "scale(1.5)",  opacity: "0" },
        },
      },
      boxShadow: {
        "card":    "0 4px 24px 0 rgba(61,79,99,0.08), 0 1px 4px 0 rgba(61,79,99,0.04)",
        "card-lg": "0 12px 48px 0 rgba(61,79,99,0.12), 0 2px 8px 0 rgba(61,79,99,0.06)",
        "btn":     "0 4px 16px 0 rgba(61,79,99,0.28)",
        "btn-coral":"0 4px 16px 0 rgba(232,85,53,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
