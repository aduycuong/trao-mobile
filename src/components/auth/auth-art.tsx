import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const SPARK = 'M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z';

export function LockArt({ size = 76 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Path
        d="M32 44V32a16 16 0 0 1 32 0v12"
        fill="none"
        stroke="#1673D9"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Rect x={22} y={42} width={52} height={42} rx={10} fill="#FFC22E" />
      <Rect x={28} y={48} width={6} height={28} rx={3} fill="#FFDB7D" />
      <Circle cx={48} cy={60} r={6} fill="#0B4A99" />
      <Rect x={45} y={62} width={6} height={12} rx={3} fill="#0B4A99" />
      <Path transform="translate(80 22)" d={SPARK} fill="#64AEF7" />
    </Svg>
  );
}

export function MailArt({ size = 132 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Circle cx={48} cy={50} r={40} fill="#E6F1FF" />
      <Rect x={18} y={32} width={60} height={42} rx={8} fill="#1673D9" />
      <Path
        d="M20 37l28 20 28-20"
        fill="none"
        stroke="#64AEF7"
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Circle cx={74} cy={32} r={12} fill="#FFC22E" />
      <Path
        d="M69 32h10M75 27.5l4.5 4.5-4.5 4.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path transform="translate(20 20)" d={SPARK} fill="#FFC22E" />
      <Circle cx={84} cy={66} r={3} fill="#64AEF7" />
    </Svg>
  );
}

export function CheckArt({ size = 132 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Circle cx={48} cy={50} r={32} fill="#E6F1FF" />
      <Circle cx={48} cy={50} r={24} fill="#1673D9" />
      <Path
        d="M37 51l8 8 15-16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={12} y={20} width={8} height={8} rx={2} fill="#FFC22E" transform="rotate(20 16 24)" />
      <Rect
        x={76}
        y={70}
        width={7}
        height={7}
        rx={2}
        fill="#FFC22E"
        transform="rotate(-15 79 73)"
      />
      <Circle cx={80} cy={26} r={3.5} fill="#64AEF7" />
      <Circle cx={18} cy={74} r={3} fill="#64AEF7" />
      <Path transform="translate(70 12)" d={SPARK} fill="#FFC22E" />
    </Svg>
  );
}
