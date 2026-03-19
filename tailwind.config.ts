import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#030a07",
        panel: "#07120d",
        panelAlt: "#101b15",
        neon: "#39ff88",
        amber: "#ffc857",
        text: "#d2f9e2",
        muted: "#8ac9a6",
        border: "#1f3f31"
      },
      boxShadow: {
        glow: "0 0 25px rgba(57, 255, 136, 0.15)",
        amberGlow: "0 0 20px rgba(255, 200, 87, 0.18)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(57,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,136,0.03) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
