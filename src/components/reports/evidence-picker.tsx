import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type EvidencePickerProps = {
  uris: string[];
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (uri: string) => void;
};

/** The row of picked photos and the dashed "+" tile (canvas Report, section "Bằng chứng"). */
export function EvidencePicker({ uris, canAdd, onAdd, onRemove }: EvidencePickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {uris.map((uri, index) => (
        <View key={uri} className="h-[72px] w-[72px]">
          <Image
            source={{ uri }}
            accessibilityLabel={`Ảnh bằng chứng ${index + 1}`}
            style={{ width: 72, height: 72, borderRadius: 12 }}
            contentFit="cover"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bỏ ảnh ${index + 1}`}
            onPress={() => onRemove(uri)}
            className="absolute h-6 w-6 items-center justify-center rounded-full bg-[#0F2440]"
            style={{ top: -6, right: -6, borderWidth: 2, borderColor: '#FFFFFF' }}
          >
            <Svg
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
            >
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
        </View>
      ))}
      {canAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm ảnh"
          onPress={onAdd}
          className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-[#F7FBFF]"
          style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9CC3F0' }}
        >
          <Svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1673D9"
            strokeWidth={2.4}
            strokeLinecap="round"
          >
            <Path d="M12 5v14M5 12h14" />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}
