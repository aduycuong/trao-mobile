import React from 'react';
import Svg, { Path } from 'react-native-svg';

type PathIconProps = {
  d: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

/** A 24x24 stroked path from the canvas (chevrons, close, pencil, tag...). */
export function PathIcon({
  d,
  size = 20,
  color = '#0F2440',
  strokeWidth = 2,
  fill = 'none',
}: PathIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={d} />
    </Svg>
  );
}

export const ICON_CHEVRON_RIGHT = 'M9 6l6 6-6 6';
export const ICON_CHEVRON_LEFT = 'M15 5l-7 7 7 7';
export const ICON_CLOSE = 'M6 6l12 12M18 6L6 18';
export const ICON_PLUS = 'M12 5v14M5 12h14';
export const ICON_CLOCK = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2';
export const ICON_TAG = 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01';
export const ICON_PENCIL = 'M4 20l4-1 11-11-3-3L5 16z';
export const ICON_TRASH = 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3';
export const ICON_NOTE = 'M5 4h14v16H5zM9 9h6M9 13h6';
export const ICON_CHECK = 'M5 12.5l4.5 4.5L19 7.5';
