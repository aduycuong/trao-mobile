import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { CATEGORY_ICON_BY_SLUG, CatIcon } from '@/components/icons/cat-icon';

type ItemThumbProps = {
  url: string | null;
  categorySlug: string | null;
  width: number;
  height: number;
  radius: number;
  iconSize?: number;
};

/** Cover of an item; without a photo, the category's icon on a soft tile (canvas StockList). */
export function ItemThumb({
  url,
  categorySlug,
  width,
  height,
  radius,
  iconSize = 38,
}: ItemThumbProps) {
  return (
    <View
      className="items-center justify-center overflow-hidden bg-[#DCEBFB]"
      style={{ width, height, borderRadius: radius }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <CatIcon
          kind={(categorySlug && CATEGORY_ICON_BY_SLUG[categorySlug]) || 'collect'}
          size={iconSize}
        />
      )}
    </View>
  );
}
