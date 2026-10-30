import React from 'react';
import { Pressable, View } from 'react-native';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import type { SearchForm } from '@/types/search';

/** Icon of a form in the search tiles and tabs (canvas CatIcons). */
export const FORM_ICON: Record<SearchForm, CatIconKind> = {
  all: 'all',
  sell: 'sale',
  trade: 'swap',
  gift: 'gift',
  auction: 'auction',
};

/** A titled block of the search sheet (canvas Main, search open). */
export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5">
      <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}

/** Filter chip: blue when on, white with a grey border when off. */
export function Chip({
  on,
  onPress,
  children,
}: {
  on: boolean;
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={`h-[38px] justify-center rounded-full border-[1.5px] px-3.5 ${
        on ? 'border-[#1673D9] bg-[#1673D9]' : 'border-[#D5DDE5] bg-white'
      }`}
    >
      <AppText className={`text-[13.5px] font-vn-medium ${on ? 'text-white' : ''}`}>
        {children}
      </AppText>
    </Pressable>
  );
}

/** Tile with an icon and a label, for forms and categories. */
export function Tile({
  on,
  onPress,
  icon,
  iconSize,
  label,
  height,
  radius,
  textSize,
  width,
}: {
  on: boolean;
  onPress: () => void;
  icon: CatIconKind;
  iconSize: number;
  label: string;
  height: number;
  radius: number;
  textSize: number;
  width?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={`items-center justify-center gap-[5px] border-2 px-0.5 ${
        on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#F1F7FE] bg-[#F1F7FE]'
      }`}
      style={[{ height, borderRadius: radius }, width ? { width } : { flex: 1 }]}
    >
      <CatIcon kind={icon} size={iconSize} />
      <AppText
        numberOfLines={1}
        className={on ? 'font-vn-semibold' : 'font-vn-medium'}
        style={{ fontSize: textSize }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
