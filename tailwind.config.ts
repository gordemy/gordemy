import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gordemy: {
          bg: "#0a0a1a",
          card: "#12122a",
          "card-hover": "#1a1a3a",
          border: "#1e293b",
          blue: "#3b82f6",
          orange: "#f97316",
          green: "#22c55e",
          purple: "#a855f7",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(59,130,246,0.4)",
        "glow-orange": "0 0 20px rgba(249,115,22,0.4)",
        "glow-green": "0 0 20px rgba(34,197,94,0.4)",
        "glow-purple": "0 0 20px rgba(168,85,247,0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;