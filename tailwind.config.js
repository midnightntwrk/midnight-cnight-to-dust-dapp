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
      extend: {},
    },
    darkMode: "class",
    plugins: [heroui()],
}