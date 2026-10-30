import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Ported from the canvas CatIcons artboard (default palette "sun").
const C = {
  y: '#FFC22E',
  yl: '#FFDB7D',
  yd: '#E8A200',
  b: '#1673D9',
  bl: '#64AEF7',
  bd: '#0B4A99',
} as const;

export type CatIconKind =
  | 'sale'
  | 'swap'
  | 'gift'
  | 'auction'
  | 'all'
  | 'phone'
  | 'laptop'
  | 'camera'
  | 'appliance'
  | 'furniture'
  | 'fashion'
  | 'vehicle'
  | 'audio'
  | 'book'
  | 'toy'
  | 'music'
  | 'baby'
  | 'student'
  | 'watch'
  | 'collect'
  | 'saved'
  | 'home'
  | 'deals'
  | 'stock'
  | 'chat'
  | 'listings'
  | 'me';

/** Icon of a category by its slug, for a card without a photo. */
export const CATEGORY_ICON_BY_SLUG: Record<string, CatIconKind> = {
  'dien-thoai': 'phone',
  laptop: 'laptop',
  'may-anh': 'camera',
  'gia-dung': 'appliance',
  'noi-that': 'furniture',
  'thoi-trang': 'fashion',
  'xe-co': 'vehicle',
  sach: 'book',
  'do-em-be': 'baby',
  'do-choi': 'toy',
  'am-thanh': 'audio',
  'suu-tam': 'collect',
};

// Same palette through the canvas `grayscale(1)` filter, for inactive tabs.
const GRAY = {
  y: '#C3C3C3',
  yl: '#DBDBDB',
  yd: '#A4A4A4',
  b: '#636363',
  bl: '#A0A0A0',
  bd: '#3F3F3F',
} as const;

type CatIconProps = { kind: CatIconKind; size?: number; grayscale?: boolean };

export function CatIcon({ kind, size = 40, grayscale }: CatIconProps) {
  const c = grayscale ? GRAY : C;
  switch (kind) {
    case 'sale':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path
            d="M18 46L44 20H70a6 6 0 0 1 6 6V52L50 78a6 6 0 0 1-8.5 0L18 54.5a6 6 0 0 1 0-8.5z"
            fill={c.y}
          />
          <Path d="M27 46L47 26" stroke={c.yl} strokeWidth="4" strokeLinecap="round" />
          <Circle cx="62" cy="34" r="6.5" fill="#FFFFFF" stroke={c.yd} strokeWidth="3" />
          <Path
            d="M62 34Q68 14 84 15"
            fill="none"
            stroke={c.bd}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Circle cx="68" cy="69" r="15" fill={c.b} />
          <Circle cx="68" cy="69" r="10.5" fill={c.bl} />
          <Path
            d="M66 62h6M70 60v11a3 3 0 1 1-3-3h3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <Path
            transform="translate(20 22)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'swap':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="12" y="20" width="38" height="32" rx="6" fill={c.y} />
          <Rect x="12" y="20" width="38" height="9" rx="4" fill={c.yd} opacity="0.45" />
          <Rect x="27" y="20" width="8" height="32" fill={c.yl} />
          <Rect x="46" y="46" width="38" height="32" rx="6" fill={c.b} />
          <Rect x="46" y="46" width="38" height="9" rx="4" fill={c.bd} opacity="0.6" />
          <Rect x="61" y="46" width="8" height="32" fill={c.bl} />
          <Path
            d="M56 24Q78 22 80 38M73 34L80 41L86 33"
            fill="none"
            stroke={c.b}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M40 72Q18 74 16 58M10 62L16 55L23 62"
            fill="none"
            stroke={c.y}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            transform="translate(84 14)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'gift':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="20" y="44" width="56" height="36" rx="6" fill={c.y} />
          <Path d="M20 68h56v6a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill={c.yd} opacity="0.45" />
          <Rect x="16" y="34" width="64" height="14" rx="5" fill={c.yl} />
          <Rect x="43" y="34" width="10" height="46" fill={c.b} />
          <Path d="M48 34C40 19 25 21 29 30C32 36 42 35 48 34z" fill={c.bl} />
          <Path d="M48 34C56 19 71 21 67 30C64 36 54 35 48 34z" fill={c.b} />
          <Circle cx="48" cy="34" r="4.5" fill={c.bd} />
          <Path
            transform="translate(80 20)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'auction':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="20" y="70" width="48" height="12" rx="4" fill={c.bd} />
          <Rect x="24" y="70" width="40" height="4" rx="2" fill={c.bl} />
          <G transform="rotate(40 50 46)">
            <Rect x="46" y="6" width="8" height="34" rx="4" fill={c.y} />
            <Rect x="47.5" y="10" width="2.5" height="24" rx="1.25" fill={c.yl} />
            <Rect x="29" y="37" width="42" height="18" rx="6" fill={c.b} />
            <Rect x="33" y="37" width="6" height="18" fill={c.bl} />
            <Rect x="61" y="37" width="6" height="18" fill={c.bl} />
          </G>
          <Path d="M20 50l-8-2M22 59l-8 4" stroke={c.y} strokeWidth="4" strokeLinecap="round" />
          <Path
            transform="translate(82 70)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'all':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="16" y="16" width="28" height="28" rx="8" fill={c.y} />
          <Rect x="52" y="16" width="28" height="28" rx="8" fill={c.b} />
          <Rect x="16" y="52" width="28" height="28" rx="8" fill={c.bl} />
          <Rect x="52" y="52" width="28" height="28" rx="14" fill={c.yl} />
          <Path d="M22 24h10" stroke={c.yl} strokeWidth="4" strokeLinecap="round" />
          <Path
            transform="translate(84 12)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="28" y="8" width="40" height="80" rx="9" fill={c.b} />
          <Rect x="33" y="16" width="30" height="60" rx="4" fill={c.bl} />
          <Rect x="42" y="11" width="12" height="3" rx="1.5" fill={c.bd} />
          <Rect x="38" y="24" width="20" height="14" rx="3" fill={c.y} />
          <Rect x="38" y="44" width="20" height="4" rx="2" fill="#FFFFFF" opacity="0.75" />
          <Rect x="38" y="52" width="13" height="4" rx="2" fill="#FFFFFF" opacity="0.5" />
          <Rect x="42" y="80" width="12" height="3" rx="1.5" fill={c.bl} />
          <Path
            transform="translate(80 20)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'laptop':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="18" y="20" width="60" height="42" rx="5" fill={c.b} />
          <Rect x="23" y="25" width="50" height="32" rx="2" fill={c.bl} />
          <Rect x="29" y="31" width="16" height="16" rx="3" fill={c.y} />
          <Rect x="50" y="33" width="17" height="4" rx="2" fill="#FFFFFF" opacity="0.75" />
          <Rect x="50" y="41" width="11" height="4" rx="2" fill="#FFFFFF" opacity="0.5" />
          <Path d="M8 64h80l-5 10H13z" fill={c.y} />
          <Rect x="40" y="64" width="16" height="3" rx="1.5" fill={c.yd} />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M32 30l5-9h22l5 9z" fill={c.yd} />
          <Rect x="12" y="28" width="72" height="48" rx="10" fill={c.y} />
          <Rect x="12" y="42" width="72" height="8" fill={c.yl} />
          <Circle cx="48" cy="52" r="18" fill={c.b} />
          <Circle cx="48" cy="52" r="12" fill={c.bl} />
          <Circle cx="48" cy="52" r="5.5" fill={c.bd} />
          <Circle cx="43" cy="47" r="3" fill="#FFFFFF" opacity="0.85" />
          <Rect x="68" y="34" width="10" height="6" rx="2" fill="#FFFFFF" />
          <Path
            transform="translate(84 16)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'appliance':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path
            d="M40 20q-4-5 0-10M50 20q-4-5 0-10M60 20q-4-5 0-10"
            fill="none"
            stroke={c.y}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Rect x="8" y="48" width="14" height="7" rx="3.5" fill={c.y} />
          <Rect x="74" y="48" width="14" height="7" rx="3.5" fill={c.y} />
          <Path d="M18 44h60v22a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12z" fill={c.b} />
          <Rect x="18" y="54" width="60" height="6" fill={c.bl} />
          <Path d="M20 44a28 14 0 0 1 56 0z" fill={c.bl} />
          <Rect x="42" y="25" width="12" height="7" rx="3.5" fill={c.bd} />
          <Path
            d="M30 38q8-6 18-6"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.6"
          />
        </Svg>
      );
    case 'furniture':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="18" y="26" width="60" height="30" rx="10" fill={c.y} />
          <Path d="M48 30v22" stroke={c.yd} strokeWidth="3" strokeLinecap="round" />
          <Rect x="16" y="50" width="64" height="18" rx="6" fill={c.yl} />
          <Rect x="8" y="40" width="14" height="30" rx="7" fill={c.b} />
          <Rect x="74" y="40" width="14" height="30" rx="7" fill={c.b} />
          <Rect x="10" y="42" width="4" height="20" rx="2" fill={c.bl} />
          <Rect x="20" y="70" width="6" height="9" rx="2" fill={c.bd} />
          <Rect x="70" y="70" width="6" height="9" rx="2" fill={c.bd} />
        </Svg>
      );
    case 'fashion':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M34 14L14 24l7 16 9-4v44h36V36l9 4 7-16-20-10a14 14 0 0 1-28 0z" fill={c.b} />
          <Path d="M34 14a14 14 0 0 0 28 0" fill="none" stroke={c.bd} strokeWidth="3.5" />
          <Path d="M20 30l6-3" stroke={c.bl} strokeWidth="4" strokeLinecap="round" />
          <Rect x="54" y="44" width="10" height="10" rx="2" fill={c.y} />
          <Rect x="30" y="66" width="36" height="5" fill={c.bl} />
          <Path
            transform="translate(82 60)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'vehicle':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M26 64C26 50 38 44 52 46h10l8-16h10l-4 8-4 8c10 4 12 12 12 18z" fill={c.y} />
          <Path
            d="M30 56c4-6 12-8 20-8"
            fill="none"
            stroke={c.yl}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Rect x="34" y="37" width="22" height="7" rx="3.5" fill={c.b} />
          <Path d="M68 30h14" stroke={c.bd} strokeWidth="4.5" strokeLinecap="round" />
          <Circle cx="26" cy="68" r="12" fill={c.bd} />
          <Circle cx="26" cy="68" r="5" fill={c.bl} />
          <Circle cx="74" cy="68" r="12" fill={c.bd} />
          <Circle cx="74" cy="68" r="5" fill={c.bl} />
        </Svg>
      );
    case 'audio':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path
            d="M20 56v-10a28 28 0 0 1 56 0v10"
            fill="none"
            stroke={c.b}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <Path
            d="M30 28q8-6 18-6"
            fill="none"
            stroke={c.bl}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Rect x="12" y="50" width="20" height="30" rx="9" fill={c.y} />
          <Rect x="64" y="50" width="20" height="30" rx="9" fill={c.y} />
          <Rect x="22" y="55" width="6" height="20" rx="3" fill={c.yd} />
          <Rect x="68" y="55" width="6" height="20" rx="3" fill={c.yd} />
          <Path
            transform="translate(82 18)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'book':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="16" y="58" width="66" height="18" rx="4" fill={c.b} />
          <Rect x="22" y="63" width="56" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.8" />
          <Rect x="22" y="69" width="56" height="3" rx="1.5" fill={c.bl} />
          <Rect x="12" y="38" width="62" height="20" rx="4" fill={c.y} />
          <Rect x="12" y="38" width="9" height="20" rx="3" fill={c.yd} />
          <Rect x="26" y="45" width="30" height="4" rx="2" fill={c.yl} />
          <Path d="M60 38v16l5-4 5 4V38z" fill={c.bd} />
          <Path
            transform="translate(80 22)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'toy':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="31" y="14" width="9" height="7" rx="2" fill={c.bl} />
          <Rect x="50" y="14" width="9" height="7" rx="2" fill={c.bl} />
          <Rect x="28" y="19" width="34" height="24" rx="4" fill={c.bl} />
          <Rect x="17" y="42" width="9" height="7" rx="2" fill={c.b} />
          <Rect x="32" y="42" width="9" height="7" rx="2" fill={c.b} />
          <Rect x="14" y="47" width="32" height="32" rx="4" fill={c.b} />
          <Rect x="54" y="42" width="9" height="7" rx="2" fill={c.y} />
          <Rect x="70" y="42" width="9" height="7" rx="2" fill={c.y} />
          <Rect x="50" y="47" width="34" height="32" rx="4" fill={c.y} />
          <Rect x="54" y="52" width="4" height="20" rx="2" fill={c.yl} />
        </Svg>
      );
    case 'music':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M54 44L80 18" stroke={c.b} strokeWidth="8" strokeLinecap="round" />
          <Rect
            x="76"
            y="8"
            width="14"
            height="14"
            rx="4"
            fill={c.bd}
            transform="rotate(45 83 15)"
          />
          <Circle cx="38" cy="64" r="21" fill={c.y} />
          <Circle cx="52" cy="48" r="14" fill={c.y} />
          <Circle cx="44" cy="58" r="6.5" fill={c.bd} />
          <Path
            d="M24 58q2-10 12-14"
            fill="none"
            stroke={c.yl}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Rect
            x="30"
            y="70"
            width="16"
            height="5"
            rx="2.5"
            fill={c.yd}
            transform="rotate(-45 38 72)"
          />
        </Svg>
      );
    case 'baby':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M40 30c0-12 4-18 8-18s8 6 8 18z" fill={c.yl} />
          <Rect x="30" y="28" width="36" height="11" rx="5" fill={c.y} />
          <Rect x="32" y="37" width="32" height="47" rx="11" fill={c.bl} />
          <Path d="M32 60h32v13a11 11 0 0 1-11 11H43a11 11 0 0 1-11-11z" fill="#FFFFFF" />
          <Rect x="38" y="44" width="10" height="3.5" rx="1.75" fill="#FFFFFF" />
          <Rect x="38" y="51" width="7" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.7" />
          <Path
            transform="translate(78 30)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'student':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M38 26a10 10 0 0 1 20 0" fill="none" stroke={c.bd} strokeWidth="5" />
          <Rect x="22" y="24" width="52" height="58" rx="14" fill={c.b} />
          <Path d="M22 40a26 14 0 0 1 52 0v4H22z" fill={c.bd} opacity="0.55" />
          <Rect x="30" y="52" width="36" height="22" rx="6" fill={c.y} />
          <Rect x="30" y="52" width="36" height="7" rx="3.5" fill={c.yd} />
          <Circle cx="48" cy="56" r="2.5" fill={c.yl} />
          <Rect x="26" y="30" width="4" height="16" rx="2" fill={c.bl} />
        </Svg>
      );
    case 'watch':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="37" y="6" width="22" height="24" rx="5" fill={c.bd} />
          <Rect x="37" y="66" width="22" height="24" rx="5" fill={c.bd} />
          <Rect x="70" y="43" width="7" height="10" rx="2.5" fill={c.yd} />
          <Circle cx="48" cy="48" r="23" fill={c.y} />
          <Circle cx="48" cy="48" r="17" fill="#FFFFFF" />
          <Path
            d="M48 37v11l8 5"
            fill="none"
            stroke={c.b}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="48" cy="48" r="2.5" fill={c.bd} />
          <Path
            transform="translate(82 22)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'collect':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M30 8h14l9 30H39z" fill={c.b} />
          <Path d="M66 8H52l-9 30h14z" fill={c.bl} />
          <Circle cx="48" cy="60" r="23" fill={c.y} />
          <Circle cx="48" cy="60" r="16" fill={c.yl} />
          <Path
            d="M48 48l3.6 7.3 8 1.2-5.8 5.6 1.4 8L48 66.3l-7.2 3.8 1.4-8-5.8-5.6 8-1.2z"
            fill={c.yd}
          />
          <Path
            transform="translate(80 38)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'saved':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M8 50Q48 4 88 50Q48 96 8 50z" fill={c.y} />
          <Path
            d="M24 36Q40 22 58 24"
            fill="none"
            stroke={c.yl}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Circle cx="48" cy="50" r="20" fill={c.b} />
          <Circle cx="48" cy="50" r="9" fill={c.bd} />
          <Circle cx="41" cy="43" r="5" fill="#FFFFFF" />
          <Path
            transform="translate(84 14)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="64" y="20" width="9" height="18" rx="2" fill={c.bd} />
          <Rect x="22" y="44" width="52" height="38" rx="5" fill={c.y} />
          <Path d="M22 70h52v7a5 5 0 0 1-5 5H27a5 5 0 0 1-5-5z" fill={c.yd} opacity="0.45" />
          <Path d="M10 48L48 17l38 31-5.5 6.5L48 28 15.5 54.5z" fill={c.b} />
          <Rect x="41" y="58" width="14" height="24" rx="4" fill={c.bd} />
          <Rect x="28" y="54" width="9" height="9" rx="2" fill={c.bl} />
          <Rect x="60" y="54" width="9" height="9" rx="2" fill={c.bl} />
          <Path
            transform="translate(84 16)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'deals':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Rect x="16" y="12" width="46" height="62" rx="7" fill={c.y} />
          <Path d="M16 60h46v7a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7z" fill={c.yd} opacity="0.45" />
          <Path
            d="M26 26h26M26 36h26M26 46h16"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Circle cx="66" cy="64" r="20" fill={c.b} />
          <Circle cx="66" cy="64" r="14" fill={c.bl} />
          <Path
            d="M58 64.5l5.5 5.5L75 58.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            transform="translate(82 18)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.bl}
          />
        </Svg>
      );
    case 'stock':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Circle cx="38" cy="36" r="11" fill={c.b} />
          <Path
            d="M32 30a8 8 0 0 1 7-4"
            fill="none"
            stroke={c.bl}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Rect
            x="50"
            y="20"
            width="16"
            height="26"
            rx="4"
            fill={c.bl}
            transform="rotate(12 58 33)"
          />
          <Path d="M16 44h64v30a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8z" fill={c.y} />
          <Path d="M16 66h64v8a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8z" fill={c.yd} opacity="0.45" />
          <Path d="M16 44L8 31h34l6 13z" fill={c.yl} />
          <Path d="M80 44l8-13H54l-6 13z" fill={c.yl} />
          <Rect x="38" y="52" width="20" height="8" rx="3" fill="#FFFFFF" opacity="0.85" />
          <Path
            transform="translate(84 14)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.b}
          />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path
            d="M18 18h40a9 9 0 0 1 9 9v22a9 9 0 0 1-9 9H38l-13 11V58h-7a9 9 0 0 1-9-9V27a9 9 0 0 1 9-9z"
            fill={c.b}
          />
          <Path
            d="M20 28a7 7 0 0 1 6-4"
            fill="none"
            stroke={c.bl}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Circle cx="27" cy="39" r="4" fill="#FFFFFF" />
          <Circle cx="38" cy="39" r="4" fill="#FFFFFF" />
          <Circle cx="49" cy="39" r="4" fill="#FFFFFF" />
          <Path
            d="M54 48h24a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8h-3v9l-10-9H54a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8z"
            fill={c.y}
          />
          <Path d="M46 66h40v3a8 8 0 0 1-8 8H54a8 8 0 0 1-8-8z" fill={c.yd} opacity="0.4" />
          <Path
            transform="translate(84 18)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'listings':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M18 40h12l34-18v52L30 56H18a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6z" fill={c.y} />
          <Path d="M12 50h52v4l-34-0H18a6 6 0 0 1-6-4z" fill={c.yd} opacity="0.45" />
          <Rect x="62" y="18" width="10" height="60" rx="5" fill={c.b} />
          <Path d="M24 56l6 22a5 5 0 0 0 6 3.5l2-.6a5 5 0 0 0 3.4-6.2L37 58z" fill={c.bd} />
          <Path
            d="M80 38q6 10 0 20"
            fill="none"
            stroke={c.bl}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Path d="M20 46h8" stroke={c.yl} strokeWidth="4" strokeLinecap="round" />
          <Path
            transform="translate(84 18)"
            d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
            fill={c.y}
          />
        </Svg>
      );
    case 'me':
      return (
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Path d="M14 86a34 28 0 0 1 68 0z" fill={c.b} />
          <Path d="M38 60l10 13 10-13z" fill={c.bl} />
          <Circle cx="48" cy="34" r="18" fill={c.y} />
          <Path
            d="M36 28a13 13 0 0 1 10-8"
            fill="none"
            stroke={c.yl}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <Circle cx="76" cy="64" r="11" fill={c.y} />
          <Path
            d="M76 58l1.8 3.7 4 .6-2.9 2.8.7 4L76 67.2l-3.6 1.9.7-4-2.9-2.8 4-.6z"
            fill="#FFFFFF"
          />
        </Svg>
      );
  }
}
