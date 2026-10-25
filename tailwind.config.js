/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Be Vietnam Pro is loaded per weight in the root layout.
      fontFamily: {
        vn: ['BeVietnamPro_400Regular'],
        'vn-medium': ['BeVietnamPro_500Medium'],
        'vn-semibold': ['BeVietnamPro_600SemiBold'],
        'vn-bold': ['BeVietnamPro_700Bold'],
      },
    },
  },
  plugins: [],
};
