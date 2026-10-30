import React from 'react';
import { View } from 'react-native';

/** The tilted yellow or red card of the penalty screens (canvas Penalty, Main). */
export function PenaltyCardSwatch({
  color,
  width,
  height,
  radius,
  margin,
  shadow = 'strong',
}: {
  color: string;
  width: number;
  height: number;
  radius: number;
  margin?: number;
  shadow?: 'strong' | 'soft' | 'tiny';
}) {
  const opacity = shadow === 'strong' ? 0.25 : shadow === 'soft' ? 0.25 : 0.3;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        marginHorizontal: margin,
        backgroundColor: color,
        transform: [{ rotate: '-8deg' }],
        shadowColor: '#0F2440',
        shadowOpacity: opacity,
        shadowRadius: shadow === 'strong' ? 4 : shadow === 'soft' ? 3 : 1.5,
        shadowOffset: { width: 0, height: shadow === 'strong' ? 2 : 1 },
        elevation: 3,
      }}
    />
  );
}
