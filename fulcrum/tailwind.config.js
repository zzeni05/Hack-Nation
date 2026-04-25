/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f4efe6",
        "paper-deep": "#ebe4d4",
        ink: "#16140f",
        "ink-soft": "#3a352b",
        "ink-mute": "#7a7264",
        rule: "#c9bfa8",
        "rule-soft": "#ddd3bd",
        rust: "#b8431c",
        "rust-deep": "#8a3214",
        ochre: "#c8932e",
        moss: "#52613a",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "scan-line": "scan-line 3s linear infinite",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "draw-line": "draw-line 1.2s ease-out forwards",
      },
      keyframes: {
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "draw-line": {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
      },
    },
  },
  plugins: [],
};
