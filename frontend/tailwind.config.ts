import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#172554"
        },
        laterite: {
          50: "#FDF3EC",
          100: "#F6DFCE",
          200: "#E9B48C",
          300: "#D98A50",
          400: "#CE6E31",
          500: "#C2571F",
          600: "#A2461A",
          700: "#813715"
        },
        granite: {
          25: "#FAFAFA",
          50: "#F4F5F4",
          100: "#ECEEEC",
          200: "#DFE2DF",
          300: "#C6CBC7",
          400: "#9AA19C",
          500: "#6C736E",
          600: "#4A514C",
          700: "#2E3531",
          800: "#1B211E",
          900: "#101412"
        },
        // Theme-aware surface tokens (see globals.css)
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        sunken: "rgb(var(--sunken) / <alpha-value>)",
        hairline: "rgb(var(--border) / <alpha-value>)",
        strongline: "rgb(var(--border-strong) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--fg-muted) / <alpha-value>)",
        subtle: "rgb(var(--fg-subtle) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-fg": "rgb(var(--accent-fg) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.06em" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "21px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["20px", { lineHeight: "26px", letterSpacing: "-0.01em" }],
        "3xl": ["26px", { lineHeight: "30px", letterSpacing: "-0.02em" }],
        "4xl": ["34px", { lineHeight: "38px", letterSpacing: "-0.025em" }],
        "5xl": ["44px", { lineHeight: "46px", letterSpacing: "-0.03em" }],
        "6xl": ["60px", { lineHeight: "62px", letterSpacing: "-0.035em" }]
      },
      borderRadius: { DEFAULT: "6px", md: "8px", lg: "10px", xl: "14px" },
      boxShadow: {
        raised: "0 8px 24px rgba(16,20,18,.10), 0 1px 2px rgba(16,20,18,.06)",
        overlay: "0 24px 48px rgba(16,20,18,.18), 0 2px 6px rgba(16,20,18,.08)"
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-left": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } }
      },
      animation: {
        "fade-in": "fade-in .15s ease-out",
        "slide-up": "slide-up .16s cubic-bezier(.2,.8,.3,1)",
        "slide-left": "slide-left .22s cubic-bezier(.2,.8,.3,1)"
      }
    }
  },
  plugins: []
};

export default config;
