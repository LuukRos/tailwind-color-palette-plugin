import type { Config } from "tailwindcss";
import { colorPlugin } from "./src/color-plugin";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    colorPlugin({
      colors: {
        primary: "#008744",
        secondary: "#0057e7",
        tertiary: "#d62d20",
        quaternary: "#ffa700",
      },
    }),
  ],
} satisfies Config;
