/** @type {import('tailwindcss').Config} */
// Neutral base: Trao's design tokens (colors, fonts, radii) are added with the UI work.
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
