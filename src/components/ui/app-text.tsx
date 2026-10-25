import React from 'react';
import { Text, type TextProps } from 'react-native';

/** Text with the app font and ink color; weight and size come from `className`. */
export function AppText({ className = '', ...props }: TextProps & { className?: string }) {
  return <Text className={`font-vn text-[#0F2440] ${className}`} {...props} />;
}
