import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Use,
} from 'react-native-svg';

// Đồng Mở hàng, ported from the canvas Coin artboard.
const ARROW = 'M96.8 80h6.4L100 63z';
const ROTATIONS = [-75, -50, -25, 0, 25, 50, 75];

function Design() {
  return (
    <>
      {ROTATIONS.map((r) => (
        <Path key={r} transform={`rotate(${r} 100 116)`} d={ARROW} />
      ))}
      <Path d="M72 116a28 28 0 0 1 56 0z" />
      <Path
        d="M66 132h68M80 142h40"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M46 116h108"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M34 72Q100 46 166 72l-1.2 5.6Q100 53 35.2 77.6z" />
      <Path
        d="M45 76L35 104M45 76L57 104M155 76L143 104M155 76L165 104"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={38.5} cy={99} r={6.5} />
      <Circle cx={49} cy={96} r={7.5} />
      <Circle cx={57.5} cy={100} r={5.5} />
      <Path d="M47 89c-1-6 3-9 8-9-1 5-4 8-8 9z" />
      <Circle cx={147} cy={99} r={7.5} />
      <Circle cx={159} cy={100} r={6} />
      <Path d="M150 92c-5-5-4-11 0-14 3 4 3 10 0 14zM154 92c1-7 6-9 10-8-1 4-5 8-10 8z" />
      <Path d="M28 102h36a2.5 2.5 0 0 1 0 5H28a2.5 2.5 0 0 1 0-5zM30.5 107h31q-2 20-15.5 22q-13.5-2-15.5-22zM136 102h36a2.5 2.5 0 0 1 0 5h-36a2.5 2.5 0 0 1 0-5zM138.5 107h31q-2 20-15.5 22q-13.5-2-15.5-22z" />
    </>
  );
}

export function CoinIcon({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="rim" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <Stop offset="0" stopColor="#FFF0B8" />
          <Stop offset="0.35" stopColor="#F7C443" />
          <Stop offset="0.7" stopColor="#D9960F" />
          <Stop offset="1" stopColor="#A86C00" />
        </LinearGradient>
        <LinearGradient id="bevel" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <Stop offset="0" stopColor="#B27400" />
          <Stop offset="0.5" stopColor="#E3A41C" />
          <Stop offset="1" stopColor="#FFE8A0" />
        </LinearGradient>
        <RadialGradient id="field" cx="0.38" cy="0.32" r="0.8">
          <Stop offset="0" stopColor="#FFE48E" />
          <Stop offset="0.45" stopColor="#F5BC30" />
          <Stop offset="1" stopColor="#D08F06" />
        </RadialGradient>
        <LinearGradient id="art" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#FFE9A6" />
          <Stop offset="0.55" stopColor="#F2B42A" />
          <Stop offset="1" stopColor="#C98A04" />
        </LinearGradient>
        <LinearGradient id="sheen" x1="0.1" y1="0" x2="0.6" y2="0.7">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <ClipPath id="clip">
          <Circle cx={100} cy={100} r={94} />
        </ClipPath>
        <G id="design">
          <Design />
        </G>
      </Defs>
      <Circle cx={100} cy={106} r={93} fill="#7A4A00" opacity={0.28} />
      <Circle cx={100} cy={103} r={94} fill="#8F5C00" />
      <Circle cx={100} cy={100} r={94} fill="url(#rim)" />
      <Circle
        cx={100}
        cy={100}
        r={88.5}
        fill="none"
        stroke="#9A6200"
        strokeOpacity={0.35}
        strokeWidth={5}
        strokeDasharray="1.1 2.3"
      />
      <Circle cx={100} cy={100} r={83} fill="url(#bevel)" />
      <Circle cx={100} cy={100} r={79} fill="url(#field)" />
      <Circle
        cx={100}
        cy={100}
        r={72}
        fill="none"
        stroke="#C88A06"
        strokeOpacity={0.45}
        strokeWidth={1.2}
      />
      <G transform="translate(100 108) scale(1.06) translate(-100 -100)">
        <G transform="translate(1.6 2)" opacity={0.55} color="#8A5600" fill="#8A5600">
          <Use href="#design" />
        </G>
        <G transform="translate(-0.9 -1.1)" color="#FFF6D2" fill="#FFF6D2">
          <Use href="#design" />
        </G>
        <G color="#D79A0E" fill="url(#art)">
          <Use href="#design" />
        </G>
        <G stroke="#A86C00" strokeWidth={1.1} fill="none" opacity={0.8}>
          <Path d="M31.5 113q15 3 30 0M33 119.5q13 3 26 0M37 125q9 2 18 0M139.5 113q15 3 30 0M141 119.5q13 3 26 0M145 125q9 2 18 0" />
          <Path d="M39 107.5v17M46 107.5v21M53 107.5v17M147 107.5v17M154 107.5v21M161 107.5v17" />
        </G>
      </G>
      <G clipPath="url(#clip)">
        <Path d="M0 0H200V60Q120 40 0 120z" fill="url(#sheen)" opacity={0.7} />
      </G>
      <Circle
        cx={100}
        cy={100}
        r={93}
        fill="none"
        stroke="#FFF7DA"
        strokeOpacity={0.6}
        strokeWidth={1.2}
        strokeDasharray="150 600"
        transform="rotate(195 100 100)"
      />
      <Path
        transform="translate(150 46)"
        d="M0-9C1.2-2 2-1.2 9 0C2 1.2 1.2 2 0 9C-1.2 2-2 1.2-9 0C-2-1.2-1.2-2 0-9Z"
        fill="#FFFFFF"
        opacity={0.9}
      />
    </Svg>
  );
}
