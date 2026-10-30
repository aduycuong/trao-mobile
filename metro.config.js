const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// NativeWind turns rem into points with a 14 px root by default; the web uses 16 px, so the
// named spacing classes (h-7, w-16, p-4, gap-2...) were 12.5% smaller than on the web.
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
