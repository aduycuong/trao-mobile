import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type TraoLogoProps = {
  size: number;
  /** Stem color: white on the blue hero, cream on the gate. */
  stem?: string;
};

export function TraoLogo({ size, stem = '#FFFFFF' }: TraoLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel="Trao">
      <Rect width={200} height={200} rx={46} fill="#1673D9" />
      <Path d="M100 66 L100 156" fill="none" stroke={stem} strokeWidth={34} strokeLinecap="round" />
      <Path
        d="M44 48 Q100 64 156 48"
        fill="none"
        stroke="#FFC22E"
        strokeWidth={34}
        strokeLinecap="round"
      />
    </Svg>
  );
}
