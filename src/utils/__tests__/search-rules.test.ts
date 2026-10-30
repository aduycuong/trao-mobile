import {
  defaultSearchRegion,
  describeFilters,
  regionLabel,
  SEARCH_EXTRAS_BY_FORM,
  SEARCH_PRICE_BUCKETS,
  SEARCH_SORTS_BY_FORM,
  toggleInList,
  withForm,
} from '../search-rules';
import type { SearchFilters } from '@/types/search';

const base: SearchFilters = { q: '', form: 'sell', conditions: [], extras: [], sort: 'rel' };
const categories = [{ slug: 'dien-thoai', name: 'Điện thoại' }];

describe('forms', () => {
  it('searches auctions everywhere and the rest near the viewer', () => {
    expect(defaultSearchRegion('auction')).toBe('nation');
    expect(defaultSearchRegion('sell')).toBe('near');
    expect(defaultSearchRegion('all')).toBe('near');
  });

  it('gives every form a relevance sort first', () => {
    for (const options of Object.values(SEARCH_SORTS_BY_FORM)) {
      expect(options[0]?.id).toBe('rel');
    }
    expect(SEARCH_SORTS_BY_FORM.sell.map((option) => option.id)).toEqual(['rel', 'new', 'low']);
    expect(SEARCH_SORTS_BY_FORM.auction.map((option) => option.id)).toEqual(['rel', 'new', 'bids']);
  });

  it('has price ranges only for sales and auctions', () => {
    expect(Object.keys(SEARCH_PRICE_BUCKETS).sort()).toEqual(['auction', 'sell']);
    expect(SEARCH_EXTRAS_BY_FORM.trade).toEqual([]);
  });

  it('resets what belongs to a form when the form changes', () => {
    const next = withForm(
      {
        ...base,
        region: 'city',
        price: '2m-8m',
        extras: ['video'],
        sort: 'low',
        category: 'laptop',
      },
      'gift'
    );
    expect(next).toMatchObject({ form: 'gift', price: undefined, extras: [], sort: 'rel' });
    expect(next.region).toBeUndefined();
    expect(next.category).toBe('laptop');
  });
});

describe('describeFilters', () => {
  it('lists the narrowing filters as removable chips', () => {
    const chips = describeFilters(
      {
        ...base,
        category: 'dien-thoai',
        price: '2m-8m',
        conditions: ['like_new', 'good'],
        extras: ['video', 'verified'],
      },
      categories
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      'Điện thoại',
      '2 – 8tr',
      'Như mới, Tốt',
      'Có video',
      'Người bán đã xác minh',
    ]);
    expect(chips[3]?.remove).toEqual({ extras: ['verified'] });
  });

  it('leaves out a price of another form and an unknown category', () => {
    const chips = describeFilters(
      { ...base, form: 'gift', price: '2m-8m', category: 'xyz' },
      categories
    );
    expect(chips).toEqual([]);
  });
});

describe('regionLabel', () => {
  it('names the areas', () => {
    expect(regionLabel('near', null)).toBe('Gần tôi');
    expect(regionLabel('near', null, true)).toBe('Gần tôi (≤ 5 km)');
    expect(regionLabel('city', 'TP.HCM')).toBe('Cả TP.HCM');
    expect(regionLabel('nation', null, true)).toBe('Toàn quốc · có giao');
  });
});

describe('toggleInList', () => {
  it('adds and removes', () => {
    expect(toggleInList(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleInList(['a', 'b'], 'a')).toEqual(['b']);
  });
});
