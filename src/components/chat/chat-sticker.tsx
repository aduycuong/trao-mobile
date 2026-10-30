import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text } from 'react-native-svg';
import { CHAT_STICKERS, type ChatStickerId } from '@/services/chat/stickers';

// Ported from the canvas Stickers artboard ("Bé Thùng"); the SVGs are the canvas ones.
const FONT = 'BeVietnamPro_700Bold';

const OUTLINE_RADIUS = 3.2;
// The canvas shadow (0 1.5 offset, 18% navy) already blended onto a white page.
const SHADOW_COLOR = '#D5D9DE';

type ShapeProps = { fill?: string; strokeWidth?: number | string; children?: React.ReactNode };

/** Paints every shape of a sticker in one colour, thickened by the outline radius. */
function silhouette(node: React.ReactNode, color: string): React.ReactNode {
  return React.Children.map(node, (child) => {
    if (!React.isValidElement<ShapeProps>(child)) return child;
    if (child.type === G) {
      return React.cloneElement(child, undefined, silhouette(child.props.children, color));
    }
    const lineOnly = child.props.fill === 'none';
    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      fill: lineOnly ? 'none' : color,
      stroke: color,
      strokeWidth: (lineOnly ? Number(child.props.strokeWidth) || 0 : 0) + OUTLINE_RADIUS * 2,
      strokeLinejoin: 'round',
      strokeLinecap: 'round',
      opacity: undefined,
    });
  });
}

/**
 * The canvas gives stickers a white sticker-style outline and a soft shadow with an SVG
 * filter. react-native-svg fills the whole filter region with white instead (a white box
 * behind the sticker), so the outline is drawn as thickened white copies of the shapes.
 */
function Outlined({ children }: { children: React.ReactNode }) {
  return (
    <>
      <G translateY={1.5}>{silhouette(children, SHADOW_COLOR)}</G>
      <G>{silhouette(children, '#FFFFFF')}</G>
      {children}
    </>
  );
}

/** One of the chat stickers, drawn in the app. `id` is `content.stickerId` of the message. */
export function ChatSticker({ id, size }: { id: string; size: number }) {
  const name = `Sticker ${CHAT_STICKERS.find((sticker) => sticker.id === id)?.name ?? ''}`.trim();
  const sticker = id as ChatStickerId;

  switch (sticker) {
    case 'chot':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <G transform="translate(64 70) rotate(-4) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Path
                d="M45 66q5-6 10 0M73 66q5-6 10 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <Path d="M54 74q10 11 20 0z" fill="#0F2440" />
              <Path
                d="M58 78q6 4 12 0"
                fill="none"
                stroke="#F0533A"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <Ellipse cx="44" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
              <Ellipse cx="84" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
            </G>
            <Path d="M94 70l12-10" stroke="#1673D9" strokeWidth="6" strokeLinecap="round" />
            <Rect x="100" y="48" width="14" height="14" rx="4" fill="#1673D9" />
            <Rect x="104" y="36" width="6" height="15" rx="3" fill="#1673D9" />
            <Path
              transform="translate(24 24) scale(1)"
              d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
              fill="#FFC22E"
            />
            <Path
              transform="translate(112 22) scale(0.8)"
              d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
              fill="#64AEF7"
            />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Chốt!
          </Text>
        </Svg>
      );
    case 'con':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <G transform="translate(64 70) rotate(6) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Circle cx="51" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="77" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="52.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Circle cx="78.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Ellipse cx="64" cy="77" rx="3.6" ry="4.4" fill="#0F2440" />
            </G>
            <Text x="104" y="38" fontFamily={FONT} fontSize="30" fill="#1673D9">
              ?
            </Text>
            <Text x="18" y="34" fontFamily={FONT} fontSize="18" fill="#64AEF7">
              ?
            </Text>
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Còn không?
          </Text>
        </Svg>
      );
    case 'bot':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <G transform="translate(64 70) rotate(0) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Path
                d="M45 66q5-6 10 0M73 66q5-6 10 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <Path d="M56 75q8 7 16 0z" fill="#0F2440" />
              <Path
                d="M58 78q6 4 12 0"
                fill="none"
                stroke="#F0533A"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <Ellipse cx="44" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
              <Ellipse cx="84" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
            </G>
            <Path
              d="M34 78l-8-12M94 78l8-12"
              stroke="#1673D9"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Circle cx="24" cy="62" r="6" fill="#1673D9" />
            <Circle cx="104" cy="62" r="6" fill="#1673D9" />
            <Path d="M96 38c0 4-3 6-5 6s-5-2-5-6 5-10 5-10 5 6 5 10z" fill="#64AEF7" />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Bớt chút nha
          </Text>
        </Svg>
      );
    case 'toi':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <Path
              d="M8 52h18M4 64h20M10 76h14"
              stroke="#64AEF7"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <G transform="translate(64 70) rotate(10) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Circle cx="51" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="77" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="52.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Circle cx="78.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Path
                d="M57 75q7 6 14 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </G>
            <Path
              d="M36 90l-10 6M92 94l10 4"
              stroke="#1673D9"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Path d="M96 66l10-6" stroke="#1673D9" strokeWidth="6" strokeLinecap="round" />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Đang tới
          </Text>
        </Svg>
      );
    case 'doi':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <G transform="translate(64 70) rotate(0) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Circle cx="51" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="77" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="52.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Circle cx="78.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Path d="M59 77h10" stroke="#0F2440" strokeWidth="3" strokeLinecap="round" />
            </G>
            <Circle cx="98" cy="30" r="13" fill="#FFFFFF" stroke="#1673D9" strokeWidth="4" />
            <Path
              d="M98 23v7l5 4"
              stroke="#0F2440"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M78 30l-4-3M118 30l4-3M80 52l-4 3M116 52l4 3"
              stroke="#64AEF7"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Path
              d="M34 76l-8 4M94 76l8 4"
              stroke="#1673D9"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Đợi xíu
          </Text>
        </Svg>
      );
    case 'camon':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <G transform="translate(64 70) rotate(-3) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Path
                d="M45 66q5-6 10 0M73 66q5-6 10 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <Path d="M57 75q7 6 14 0z" fill="#0F2440" />
              <Path
                d="M58 78q6 4 12 0"
                fill="none"
                stroke="#F0533A"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <Ellipse cx="44" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
              <Ellipse cx="84" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
            </G>
            <Path
              d="M64 106c-12-8-20-14-20-22a8 8 0 0 1 14-5l6 6 6-6a8 8 0 0 1 14 5c0 8-8 14-20 22z"
              transform="translate(22 30) scale(0.66)"
              fill="#F0533A"
            />
            <Path
              d="M40 86l8-2M88 86l-8-2"
              stroke="#1673D9"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Path
              transform="translate(22 30) scale(0.7)"
              d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
              fill="#F0533A"
            />
            <Path
              transform="translate(108 28) scale(1)"
              d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
              fill="#FFC22E"
            />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Cảm ơn nha
          </Text>
        </Svg>
      );
    case 'nhan':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <Path
              d="M14 40l6 4M110 52l6-3M20 88l5-3"
              stroke="#FFC22E"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <G transform="translate(64 70) rotate(0) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Path
                d="M45 66q5-6 10 0M73 66q5-6 10 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <Path d="M54 74q10 11 20 0z" fill="#0F2440" />
              <Path
                d="M58 78q6 4 12 0"
                fill="none"
                stroke="#F0533A"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </G>
            <Circle cx="98" cy="40" r="15" fill="#1673D9" />
            <Path
              d="M91 40.5l5 5 9-10"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M32 74l-10-10M96 74l10-10"
              stroke="#1673D9"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Đã nhận!
          </Text>
        </Svg>
      );
    case 'ok':
      return (
        <Svg width={size} height={size} accessibilityLabel={name} viewBox="0 0 128 128">
          <Outlined>
            <G transform="translate(64 70) rotate(4) translate(-64 -70)">
              <Path d="M32 40h64v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z" fill="#FFC22E" />
              <Path
                d="M32 80h64v6a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10z"
                fill="#E8A200"
                opacity="0.4"
              />
              <Path d="M32 40L25 29h36l3 11z" fill="#FFDB7D" />
              <Path d="M96 40l7-11H67l-3 11z" fill="#FFDB7D" />
              <Rect x="58" y="40" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.55" />
              <Path
                d="M45 66q5-5 10 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <Circle cx="77" cy="65" r="4.2" fill="#0F2440" />
              <Circle cx="78.4" cy="63.6" r="1.4" fill="#FFFFFF" />
              <Path
                d="M57 75q7 6 14 0"
                fill="none"
                stroke="#0F2440"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <Ellipse cx="44" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
              <Ellipse cx="84" cy="73" rx="5" ry="3" fill="#F0533A" opacity="0.35" />
            </G>
            <Path d="M94 74l10-10" stroke="#1673D9" strokeWidth="6" strokeLinecap="round" />
            <Circle cx="108" cy="58" r="9" fill="#1673D9" />
            <Circle cx="108" cy="58" r="3.4" fill="#FFFFFF" />
            <Rect
              x="112"
              y="40"
              width="5"
              height="14"
              rx="2.5"
              fill="#1673D9"
              transform="translate(114 47) rotate(10) translate(-114 -47)"
            />
            <Path
              transform="translate(22 26) scale(0.8)"
              d="M0-7C1-1.5 1.5-1 7 0C1.5 1 1 1.5 0 7C-1 1.5-1.5 1-7 0C-1.5-1-1-1.5 0-7Z"
              fill="#64AEF7"
            />
          </Outlined>
          <Rect
            x="16"
            y="101"
            width="96"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#0B4A99"
            strokeWidth="2"
          />
          <Text x="64" y="117" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fill="#0B4A99">
            Ok luôn
          </Text>
        </Svg>
      );
    default:
      return null;
  }
}
