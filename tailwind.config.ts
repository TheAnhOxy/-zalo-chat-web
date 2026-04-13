import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
        // Màu xanh đặc trưng giống Zalo
        zalo: {
          blue: "#0068FF",
          light: "#E5EFFF",
          dark: "#0052CC",
        },
        // Hệ thống màu bổ trợ cho Chat (nền, tin nhắn)
        chat: {
          bg: "#F4F5F7",
          "bg-dark": "#1A1A1A",
          bubble: "#FFFFFF",
          "bubble-user": "#E5EFFF",
          "bubble-dark": "#2C2C2C",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        // Hiệu ứng tin nhắn mới bay vào
        "message-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "message-in": "message-in 0.3s ease-out forwards",
      },
    },
  },
 plugins: [
  require("tailwindcss-animate"),
  require("@tailwindcss/aspect-ratio"), // Thêm dòng này
],
};

export default config;