import React from 'react';
import { ScrollView } from 'react-native';
import {
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
  type ListingType,
  type PublicListingCounts,
} from '@/types/people';
import { FilterChip } from '@/components/ui/filter-chip';

type TypeChipsProps = {
  counts: PublicListingCounts;
  value: ListingType | undefined;
  onChange: (type: ListingType | undefined) => void;
};

/** Filter chips of a person's listings: "Tất cả" and each form that has listings. */
export function TypeChips({ counts, value, onChange }: TypeChipsProps) {
  const chips = [
    { value: undefined, label: 'Tất cả', count: counts.all },
    ...LISTING_TYPES.filter((type) => counts[type] > 0).map((type) => ({
      value: type,
      label: LISTING_TYPE_LABELS[type],
      count: counts[type],
    })),
  ];

  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
    >
      {chips.map((chip) => (
        <FilterChip
          key={chip.label}
          label={chip.label}
          count={chip.count}
          on={chip.value === value}
          onPress={() => onChange(chip.value)}
        />
      ))}
    </ScrollView>
  );
}
