const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
      './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
      // HeroUI components
      "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Custom theme colors
          'brand-primary': '#0000FE',
          'brand-primary-hover': '#0000CC', // Darker variant for hover
          'brand-primary-active': '#0000AA', // Even darker for active state

          // Additional brand colors
          'primary': '#0000FE', // Alias for primary brand color
          'primary-hover': '#0000CC',
          'primary-active': '#0000AA',
        },
      },
    },
    darkMode: "class",
    plugins: [heroui()],
}